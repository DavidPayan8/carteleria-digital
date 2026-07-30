import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { DAY_BITS, DAY_LABELS, Playlist, Schedule, Screen, ScreenGroup, ScreenZone } from "../../core/models/models";
import { PlaylistsService } from "../../core/services/playlists.service";
import { ScreenGroupsService } from "../../core/services/screen-groups.service";
import { ScreenZonesService } from "../../core/services/screen-zones.service";
import { SchedulesService } from "../../core/services/schedules.service";
import { ScreensService } from "../../core/services/screens.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";
import { buildCalendarBlocks, buildWeekDates, CalendarBlock, getMonday } from "./schedule-calendar";

type Target = "location" | "screen" | "zone" | "group";
type ViewMode = "list" | "calendar";

interface CalendarTargetOption {
  key: string;
  label: string;
}

export const CALENDAR_HOUR_HEIGHT = 28;

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

@Component({
  selector: "app-schedules",
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: "./schedules.html",
})
export class Schedules implements OnInit {
  readonly schedules = signal<Schedule[]>([]);
  readonly playlists = signal<Playlist[]>([]);
  readonly screens = signal<Screen[]>([]);
  readonly zones = signal<ScreenZone[]>([]);
  readonly groups = signal<ScreenGroup[]>([]);
  readonly showForm = signal(false);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly viewMode = signal<ViewMode>("list");
  readonly calendarTargetKey = signal<string>("location");
  readonly calendarWeekStart = signal<Date>(getMonday(new Date()));

  readonly dayLabels = DAY_LABELS;
  readonly dayBits = DAY_BITS;
  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly dayIndexes = [0, 1, 2, 3, 4, 5, 6];
  readonly hourHeight = CALENDAR_HOUR_HEIGHT;

  readonly calendarTargets = computed<CalendarTargetOption[]>(() => {
    const options: CalendarTargetOption[] = [{ key: "location", label: "Todo el restaurante" }];
    for (const group of this.groups()) {
      options.push({ key: `group:${group.id}`, label: `Grupo: ${group.name}` });
    }
    for (const screen of this.screens()) {
      const screenZones = this.zones().filter((z) => z.screenId === screen.id);
      if (screenZones.length > 0) {
        for (const zone of screenZones) {
          options.push({ key: `zone:${zone.id}`, label: `${screen.name} / ${zone.name}` });
        }
      } else {
        options.push({ key: `screen:${screen.id}`, label: screen.name });
      }
    }
    return options;
  });

  // Mismo criterio de aplicabilidad que scheduleResolver.ts en el backend: para una pantalla
  // sin zonas compiten sus propias Schedules, las de "todo el restaurante" y, si pertenece a un
  // grupo, las del grupo; una zona solo ve las Schedules que apuntan directamente a ella.
  readonly calendarSchedules = computed<Schedule[]>(() => {
    const key = this.calendarTargetKey();
    const locationId = this.workspace.selectedLocationId();
    if (key === "location") {
      return this.schedules().filter((s) => s.locationId === locationId);
    }
    if (key.startsWith("group:")) {
      const groupId = key.slice("group:".length);
      return this.schedules().filter((s) => s.screenGroupId === groupId);
    }
    if (key.startsWith("screen:")) {
      const screenId = key.slice("screen:".length);
      const screenGroupId = this.screens().find((s) => s.id === screenId)?.screenGroupId ?? null;
      return this.schedules().filter(
        (s) => s.screenId === screenId || s.locationId === locationId || (screenGroupId && s.screenGroupId === screenGroupId),
      );
    }
    if (key.startsWith("zone:")) {
      const zoneId = key.slice("zone:".length);
      return this.schedules().filter((s) => s.screenZoneId === zoneId);
    }
    return [];
  });

  readonly calendarWeekDates = computed<Date[]>(() => buildWeekDates(this.calendarWeekStart()));

  readonly calendarBlocksByDay = computed<CalendarBlock[][]>(() =>
    buildCalendarBlocks(this.calendarSchedules(), this.calendarWeekDates()),
  );

  readonly calendarConflictCount = computed(
    () => this.calendarBlocksByDay().flat().filter((b) => !b.isWinner).length,
  );

  readonly calendarWeekStartInput = computed(() => toDateInputValue(this.calendarWeekStart()));

  readonly weekRangeLabel = computed(() => {
    const dates = this.calendarWeekDates();
    const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    return `${fmt(dates[0])} – ${fmt(dates[6])}`;
  });

  name = "";
  playlistId = "";
  target: Target = "location";
  screenId = "";
  screenZoneId = "";
  screenGroupId = "";
  priority = 0;
  startDate = new Date().toISOString().slice(0, 10);
  endDate = "";
  startTime = "00:00";
  endTime = "23:59";
  selectedDays = new Set<number>(DAY_BITS);

  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly playlistsService: PlaylistsService,
    private readonly screensService: ScreensService,
    private readonly screenZonesService: ScreenZonesService,
    private readonly screenGroupsService: ScreenGroupsService,
    private readonly confirmDialog: ConfirmDialogService,
    readonly workspace: WorkspaceService,
  ) {
    effect(() => {
      if (this.workspace.selectedLocationId()) void this.load();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    const organizationId = this.workspace.selectedOrganizationId();
    if (!locationId || !organizationId) return;
    this.loading.set(true);
    try {
      const [schedules, playlists, screens, groups] = await Promise.all([
        firstValueFrom(this.schedulesService.list({ locationId })),
        firstValueFrom(this.playlistsService.list({ organizationId })),
        firstValueFrom(this.screensService.list(locationId)),
        firstValueFrom(this.screenGroupsService.list(locationId)),
      ]);
      this.schedules.set(schedules);
      this.playlists.set(playlists);
      this.screens.set(screens);
      this.groups.set(groups);

      const zonesByScreen = await Promise.all(
        screens.map((s) => firstValueFrom(this.screenZonesService.list(s.id))),
      );
      this.zones.set(zonesByScreen.flat());
    } finally {
      this.loading.set(false);
    }
  }

  toggleDay(bit: number): void {
    if (this.selectedDays.has(bit)) this.selectedDays.delete(bit);
    else this.selectedDays.add(bit);
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  blockTooltip(block: CalendarBlock): string {
    const time = `${this.formatMinutes(block.startMinutes)}–${this.formatMinutes(block.endMinutes)}`;
    const base = `${block.schedule.name} · ${this.playlistName(block.schedule.playlistId)} · prioridad ${block.schedule.priority} · ${time}`;
    if (block.isWinner) return base;
    return `${base} · sustituida por otra programación de mayor prioridad en este horario`;
  }

  screenName(id: string | null): string {
    return this.screens().find((s) => s.id === id)?.name ?? "";
  }

  playlistName(id: string): string {
    return this.playlists().find((p) => p.id === id)?.name ?? id;
  }

  zonesForSelectedScreen(): ScreenZone[] {
    return this.zones().filter((z) => z.screenId === this.screenId);
  }

  zoneLabel(id: string | null): string {
    if (!id) return "";
    const zone = this.zones().find((z) => z.id === id);
    if (!zone) return "";
    return `${this.screenName(zone.screenId)} / ${zone.name}`;
  }

  groupLabel(id: string | null): string {
    if (!id) return "";
    return this.groups().find((g) => g.id === id)?.name ?? "";
  }

  previousWeek(): void {
    const d = new Date(this.calendarWeekStart());
    d.setDate(d.getDate() - 7);
    this.calendarWeekStart.set(d);
  }

  nextWeek(): void {
    const d = new Date(this.calendarWeekStart());
    d.setDate(d.getDate() + 7);
    this.calendarWeekStart.set(d);
  }

  goToCurrentWeek(): void {
    this.calendarWeekStart.set(getMonday(new Date()));
  }

  onWeekDateInput(value: string): void {
    if (!value) return;
    const [year, month, day] = value.split("-").map(Number);
    this.calendarWeekStart.set(getMonday(new Date(year, month - 1, day)));
  }

  openCreateForm(): void {
    if (this.showForm() && !this.editingId()) {
      this.showForm.set(false);
      return;
    }
    this.editingId.set(null);
    this.resetForm();
    this.error.set(null);
    this.showForm.set(true);
  }

  startEdit(schedule: Schedule): void {
    this.error.set(null);
    this.editingId.set(schedule.id);
    this.name = schedule.name;
    this.playlistId = schedule.playlistId;
    this.priority = schedule.priority;
    this.startDate = schedule.startDate.slice(0, 10);
    this.endDate = schedule.endDate ? schedule.endDate.slice(0, 10) : "";
    this.startTime = schedule.startTime.slice(11, 16);
    this.endTime = schedule.endTime.slice(11, 16);
    this.selectedDays = new Set(DAY_BITS.filter((bit) => (schedule.daysOfWeek & bit) === bit));

    if (schedule.screenZoneId) {
      this.target = "zone";
      this.screenZoneId = schedule.screenZoneId;
      this.screenId = this.zones().find((z) => z.id === schedule.screenZoneId)?.screenId ?? "";
      this.screenGroupId = "";
    } else if (schedule.screenId) {
      this.target = "screen";
      this.screenId = schedule.screenId;
      this.screenZoneId = "";
      this.screenGroupId = "";
    } else if (schedule.screenGroupId) {
      this.target = "group";
      this.screenGroupId = schedule.screenGroupId;
      this.screenId = "";
      this.screenZoneId = "";
    } else {
      this.target = "location";
      this.screenId = "";
      this.screenZoneId = "";
      this.screenGroupId = "";
    }

    this.showForm.set(true);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.showForm.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.name = "";
    this.playlistId = "";
    this.target = "location";
    this.screenId = "";
    this.screenZoneId = "";
    this.screenGroupId = "";
    this.priority = 0;
    this.startDate = new Date().toISOString().slice(0, 10);
    this.endDate = "";
    this.startTime = "00:00";
    this.endTime = "23:59";
    this.selectedDays = new Set<number>(DAY_BITS);
  }

  async save(): Promise<void> {
    this.error.set(null);
    const locationId = this.workspace.selectedLocationId();
    if (!locationId || !this.playlistId || !this.name) return;
    if (this.target === "screen" && !this.screenId) {
      this.error.set("Selecciona una pantalla.");
      return;
    }
    if (this.target === "zone" && !this.screenZoneId) {
      this.error.set("Selecciona una zona.");
      return;
    }
    if (this.target === "group" && !this.screenGroupId) {
      this.error.set("Selecciona un grupo.");
      return;
    }

    const daysOfWeek = [...this.selectedDays].reduce((acc, bit) => acc | bit, 0);

    const targetField =
      this.target === "screen"
        ? { screenId: this.screenId }
        : this.target === "zone"
          ? { screenZoneId: this.screenZoneId }
          : this.target === "group"
            ? { screenGroupId: this.screenGroupId }
            : { locationId };

    const editingId = this.editingId();

    try {
      const payload = {
        playlistId: this.playlistId,
        name: this.name,
        priority: this.priority,
        startDate: this.startDate,
        endDate: this.endDate || undefined,
        daysOfWeek,
        startTime: this.startTime,
        endTime: this.endTime,
        ...targetField,
      };
      if (editingId) {
        await firstValueFrom(this.schedulesService.update(editingId, payload));
      } else {
        await firstValueFrom(this.schedulesService.create(payload));
      }
    } catch {
      this.error.set(
        editingId
          ? "No se pudo guardar la programación. Revisa los datos e inténtalo de nuevo."
          : "No se pudo crear la programación. Revisa los datos e inténtalo de nuevo.",
      );
      return;
    }

    this.editingId.set(null);
    this.showForm.set(false);
    this.resetForm();
    await this.load();
  }

  async remove(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar esta programación?",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.schedulesService.delete(id));
    await this.load();
  }
}
