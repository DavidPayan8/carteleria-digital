import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { MediaService } from "../../core/services/media.service";
import { PlaylistsService } from "../../core/services/playlists.service";
import { ScreensService } from "../../core/services/screens.service";
import { WorkspaceService } from "../../core/services/workspace.service";

interface Stats {
  screensTotal: number;
  screensOnline: number;
  mediaTotal: number;
  playlistsTotal: number;
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./dashboard.html",
})
export class Dashboard implements OnInit {
  readonly stats = signal<Stats | null>(null);

  constructor(
    readonly workspace: WorkspaceService,
    private readonly screensService: ScreensService,
    private readonly mediaService: MediaService,
    private readonly playlistsService: PlaylistsService,
  ) {
    effect(() => {
      const orgId = this.workspace.selectedOrganizationId();
      if (orgId) void this.load();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const organizationId = this.workspace.selectedOrganizationId();
    if (!organizationId) return;

    // No hay endpoint "screens por organización" todavía (los Screens cuelgan de
    // Location, no directamente de Organization), así que se agregan por cada
    // restaurante de la organización seleccionada.
    const locationIds = this.workspace.locations().map((l) => l.id);
    const [screensByLocation, media, playlists] = await Promise.all([
      Promise.all(locationIds.map((id) => firstValueFrom(this.screensService.list(id)))),
      firstValueFrom(this.mediaService.list(organizationId)),
      firstValueFrom(this.playlistsService.list({ organizationId })),
    ]);
    const screens = screensByLocation.flat();

    this.stats.set({
      screensTotal: screens.length,
      screensOnline: screens.filter((s) => isOnline(s.lastSeenAt)).length,
      mediaTotal: media.length,
      playlistsTotal: playlists.length,
    });
  }
}
