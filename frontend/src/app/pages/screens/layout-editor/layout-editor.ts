import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnInit, ViewChild, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Playlist, Schedule, Screen, ScreenZone } from "../../../core/models/models";
import { PlaylistsService } from "../../../core/services/playlists.service";
import { ScreenZonesService } from "../../../core/services/screen-zones.service";
import { SchedulesService } from "../../../core/services/schedules.service";
import { ScreensService } from "../../../core/services/screens.service";
import { WorkspaceService } from "../../../core/services/workspace.service";
import { ConfirmDialogService } from "../../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../../shared/spinner/spinner.component";

interface EditableZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

type ZoneField = "x" | "y" | "width" | "height";
type DragMode = "move" | "resize";

function toEditable(z: ScreenZone): EditableZone {
  return {
    id: z.id,
    name: z.name,
    x: Number(z.x),
    y: Number(z.y),
    width: Number(z.width),
    height: Number(z.height),
    zIndex: z.zIndex,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

@Component({
  selector: "app-screen-layout-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: "./layout-editor.html",
})
export class ScreenLayoutEditor implements OnInit {
  @ViewChild("canvas") canvasRef!: ElementRef<HTMLDivElement>;

  readonly screen = signal<Screen | null>(null);
  readonly zones = signal<EditableZone[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly playlists = signal<Playlist[]>([]);
  readonly zoneSchedules = signal<Schedule[]>([]);
  readonly loading = signal(false);

  quickPlaylistId = "";

  private screenId = "";
  private drag: { zoneId: string; mode: DragMode; startX: number; startY: number; orig: EditableZone } | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly screensService: ScreensService,
    private readonly zonesService: ScreenZonesService,
    private readonly schedulesService: SchedulesService,
    private readonly playlistsService: PlaylistsService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly workspace: WorkspaceService,
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get("id")!;
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [screen, zones] = await Promise.all([
        firstValueFrom(this.screensService.get(this.screenId)),
        firstValueFrom(this.zonesService.list(this.screenId)),
      ]);
      this.screen.set(screen);
      this.zones.set(zones.map(toEditable).sort((a, b) => a.zIndex - b.zIndex));

      const organizationId = this.workspace.selectedOrganizationId();
      if (organizationId) {
        this.playlists.set(await firstValueFrom(this.playlistsService.list({ organizationId })));
      }
      if (zones.length > 0) {
        const perZone = await Promise.all(
          zones.map((z) => firstValueFrom(this.schedulesService.list({ screenZoneId: z.id }))),
        );
        this.zoneSchedules.set(perZone.flat());
      } else {
        this.zoneSchedules.set([]);
      }
    } finally {
      this.loading.set(false);
    }
  }

  get selectedZone(): EditableZone | null {
    return this.zones().find((z) => z.id === this.selectedId()) ?? null;
  }

  scheduleForSelected(): Schedule | null {
    const zone = this.selectedZone;
    if (!zone) return null;
    return this.zoneSchedules().find((s) => s.screenZoneId === zone.id) ?? null;
  }

  playlistName(id: string): string {
    return this.playlists().find((p) => p.id === id)?.name ?? id;
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.quickPlaylistId = "";
  }

  async addZone(): Promise<void> {
    const maxZIndex = this.zones().reduce((max, z) => Math.max(max, z.zIndex), -1);
    const created = await firstValueFrom(
      this.zonesService.create(this.screenId, {
        name: `Zona ${this.zones().length + 1}`,
        x: 10,
        y: 10,
        width: 40,
        height: 40,
        zIndex: maxZIndex + 1,
      }),
    );
    this.zones.update((zs) => [...zs, toEditable(created)]);
    this.selectedId.set(created.id);
  }

  async renameSelected(name: string): Promise<void> {
    const zone = this.selectedZone;
    if (!zone || !name.trim()) return;
    this.zones.update((zs) => zs.map((z) => (z.id === zone.id ? { ...z, name } : z)));
    await firstValueFrom(this.zonesService.update(zone.id, { name }));
  }

  /** Edición numérica directa además del arrastre: más precisa, y accesible sin depender de agarrar bien el rectángulo. */
  async setField(field: ZoneField, rawValue: string): Promise<void> {
    const zone = this.selectedZone;
    const value = Number(rawValue);
    if (!zone || Number.isNaN(value)) return;
    const clamped = field === "width" || field === "height" ? clamp(value, 1, 100) : clamp(value, 0, 100);
    this.zones.update((zs) => zs.map((z) => (z.id === zone.id ? { ...z, [field]: clamped } : z)));
    await firstValueFrom(this.zonesService.update(zone.id, { [field]: clamped }));
  }

  async bringToFront(): Promise<void> {
    const zone = this.selectedZone;
    if (!zone) return;
    const maxZIndex = Math.max(...this.zones().map((z) => z.zIndex));
    const zIndex = maxZIndex + 1;
    await this.setZIndex(zone.id, zIndex);
  }

  async sendToBack(): Promise<void> {
    const zone = this.selectedZone;
    if (!zone) return;
    const minZIndex = Math.min(...this.zones().map((z) => z.zIndex));
    const zIndex = minZIndex - 1;
    await this.setZIndex(zone.id, zIndex);
  }

  private async setZIndex(zoneId: string, zIndex: number): Promise<void> {
    this.zones.update((zs) =>
      zs.map((z) => (z.id === zoneId ? { ...z, zIndex } : z)).sort((a, b) => a.zIndex - b.zIndex),
    );
    await firstValueFrom(this.zonesService.update(zoneId, { zIndex }));
  }

  async removeSelected(): Promise<void> {
    const zone = this.selectedZone;
    if (!zone) return;
    const confirmed = await this.confirmDialog.confirm({
      message: `¿Borrar la zona "${zone.name}"? Las programaciones asignadas a ella también se borrarán.`,
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.zonesService.delete(zone.id));
    this.zones.update((zs) => zs.filter((z) => z.id !== zone.id));
    this.zoneSchedules.update((ss) => ss.filter((s) => s.screenZoneId !== zone.id));
    this.selectedId.set(null);
  }

  /** Asignación rápida: una playlist a pantalla completa de tiempo para la zona, sin salir de esta página.
   *  Para horarios más finos (franjas, prioridades), se sigue gestionando desde Programaciones. */
  async assignQuickPlaylist(): Promise<void> {
    const zone = this.selectedZone;
    if (!zone || !this.quickPlaylistId) return;
    await firstValueFrom(
      this.schedulesService.create({
        playlistId: this.quickPlaylistId,
        screenZoneId: zone.id,
        name: `${zone.name} — ${this.playlistName(this.quickPlaylistId)}`,
        startDate: new Date().toISOString().slice(0, 10),
      }),
    );
    this.quickPlaylistId = "";
    const schedules = await firstValueFrom(this.schedulesService.list({ screenZoneId: zone.id }));
    this.zoneSchedules.update((ss) => [...ss.filter((s) => s.screenZoneId !== zone.id), ...schedules]);
  }

  async removeZoneSchedule(schedule: Schedule): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: `¿Quitar "${schedule.name}" de esta zona?`,
      confirmText: "Quitar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.schedulesService.delete(schedule.id));
    this.zoneSchedules.update((ss) => ss.filter((s) => s.id !== schedule.id));
  }

  startDrag(event: MouseEvent, zone: EditableZone): void {
    event.preventDefault();
    this.selectedId.set(zone.id);
    this.beginDrag(event, zone, "move");
  }

  startResize(event: MouseEvent, zone: EditableZone): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedId.set(zone.id);
    this.beginDrag(event, zone, "resize");
  }

  private beginDrag(event: MouseEvent, zone: EditableZone, mode: DragMode): void {
    this.drag = { zoneId: zone.id, mode, startX: event.clientX, startY: event.clientY, orig: { ...zone } };
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.drag) return;
    const canvasBounds = this.canvasRef.nativeElement.getBoundingClientRect();
    const dxPct = ((event.clientX - this.drag.startX) / canvasBounds.width) * 100;
    const dyPct = ((event.clientY - this.drag.startY) / canvasBounds.height) * 100;
    const { orig, mode, zoneId } = this.drag;

    this.zones.update((zs) =>
      zs.map((z) => {
        if (z.id !== zoneId) return z;
        if (mode === "move") {
          const x = round1(clamp(orig.x + dxPct, 0, 100 - orig.width));
          const y = round1(clamp(orig.y + dyPct, 0, 100 - orig.height));
          return { ...z, x, y };
        }
        const width = round1(clamp(orig.width + dxPct, 5, 100 - orig.x));
        const height = round1(clamp(orig.height + dyPct, 5, 100 - orig.y));
        return { ...z, width, height };
      }),
    );
  };

  private readonly onMouseUp = (): void => {
    if (!this.drag) return;
    const zoneId = this.drag.zoneId;
    this.drag = null;
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);

    const zone = this.zones().find((z) => z.id === zoneId);
    if (!zone) return;
    void firstValueFrom(
      this.zonesService.update(zoneId, { x: zone.x, y: zone.y, width: zone.width, height: zone.height }),
    );
  };
}
