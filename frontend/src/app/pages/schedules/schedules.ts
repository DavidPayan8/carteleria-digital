import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { DAY_BITS, DAY_LABELS, Playlist, Schedule, Screen } from "../../core/models/models";
import { PlaylistsService } from "../../core/services/playlists.service";
import { SchedulesService } from "../../core/services/schedules.service";
import { ScreensService } from "../../core/services/screens.service";
import { WorkspaceService } from "../../core/services/workspace.service";

type Target = "location" | "screen";

@Component({
  selector: "app-schedules",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./schedules.html",
})
export class Schedules implements OnInit {
  readonly schedules = signal<Schedule[]>([]);
  readonly playlists = signal<Playlist[]>([]);
  readonly screens = signal<Screen[]>([]);
  readonly showForm = signal(false);

  readonly dayLabels = DAY_LABELS;
  readonly dayBits = DAY_BITS;

  name = "";
  playlistId = "";
  target: Target = "location";
  screenId = "";
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
    const [schedules, playlists, screens] = await Promise.all([
      firstValueFrom(this.schedulesService.list({ locationId })),
      firstValueFrom(this.playlistsService.list({ organizationId })),
      firstValueFrom(this.screensService.list(locationId)),
    ]);
    this.schedules.set(schedules);
    this.playlists.set(playlists);
    this.screens.set(screens);
  }

  toggleDay(bit: number): void {
    if (this.selectedDays.has(bit)) this.selectedDays.delete(bit);
    else this.selectedDays.add(bit);
  }

  screenName(id: string | null): string {
    return this.screens().find((s) => s.id === id)?.name ?? "";
  }

  playlistName(id: string): string {
    return this.playlists().find((p) => p.id === id)?.name ?? id;
  }

  async create(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId || !this.playlistId || !this.name) return;

    const daysOfWeek = [...this.selectedDays].reduce((acc, bit) => acc | bit, 0);

    await firstValueFrom(
      this.schedulesService.create({
        playlistId: this.playlistId,
        name: this.name,
        priority: this.priority,
        startDate: this.startDate,
        endDate: this.endDate || undefined,
        daysOfWeek,
        startTime: this.startTime,
        endTime: this.endTime,
        ...(this.target === "screen" ? { screenId: this.screenId } : { locationId }),
      }),
    );

    this.name = "";
    this.playlistId = "";
    this.showForm.set(false);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar esta programación?")) return;
    await firstValueFrom(this.schedulesService.delete(id));
    await this.load();
  }
}
