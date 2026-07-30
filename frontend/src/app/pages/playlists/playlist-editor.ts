
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Media, Playlist } from "../../core/models/models";
import { MediaService } from "../../core/services/media.service";
import { PlaylistsService } from "../../core/services/playlists.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

const TRANSITIONS = ["fade", "slide-left", "slide-right", "cut"];

@Component({
  selector: "app-playlist-editor",
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent],
  templateUrl: "./playlist-editor.html",
})
export class PlaylistEditor implements OnInit {
  readonly playlist = signal<Playlist | null>(null);
  readonly mediaLibrary = signal<Media[]>([]);
  readonly loading = signal(false);
  readonly transitions = TRANSITIONS;
  selectedMediaId = "";

  private playlistId = "";

  constructor(
    private readonly route: ActivatedRoute,
    private readonly playlistsService: PlaylistsService,
    private readonly mediaService: MediaService,
    private readonly workspace: WorkspaceService,
  ) {}

  ngOnInit(): void {
    this.playlistId = this.route.snapshot.paramMap.get("id")!;
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const playlist = await firstValueFrom(this.playlistsService.get(this.playlistId));
      this.playlist.set(playlist);
      const orgId = playlist.organizationId ?? this.workspace.selectedOrganizationId();
      if (orgId) {
        this.mediaLibrary.set(await firstValueFrom(this.mediaService.list(orgId)));
      }
    } finally {
      this.loading.set(false);
    }
  }

  async addSelectedMedia(): Promise<void> {
    const playlist = this.playlist();
    if (!playlist || !this.selectedMediaId) return;
    const nextOrder = (playlist.items?.length ?? 0) + 1;
    await firstValueFrom(
      this.playlistsService.addItem(playlist.id, { mediaId: this.selectedMediaId, sortOrder: nextOrder }),
    );
    this.selectedMediaId = "";
    await this.load();
  }

  async removeItem(itemId: string): Promise<void> {
    const playlist = this.playlist();
    if (!playlist) return;
    await firstValueFrom(this.playlistsService.removeItem(playlist.id, itemId));
    await this.load();
  }

  async updateDuration(itemId: string, seconds: number): Promise<void> {
    const playlist = this.playlist();
    if (!playlist || !seconds || seconds <= 0) return;
    await firstValueFrom(this.playlistsService.updateItem(playlist.id, itemId, { durationSecondsOverride: seconds }));
    await this.load();
  }

  async updateTransition(itemId: string, transitionType: string): Promise<void> {
    const playlist = this.playlist();
    if (!playlist) return;
    await firstValueFrom(this.playlistsService.updateItem(playlist.id, itemId, { transitionType }));
    await this.load();
  }

  async moveItem(index: number, direction: -1 | 1): Promise<void> {
    const playlist = this.playlist();
    if (!playlist?.items) return;
    const items = [...playlist.items];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];

    await firstValueFrom(
      this.playlistsService.reorderItems(
        playlist.id,
        items.map((item, i) => ({ itemId: item.id, sortOrder: i + 1 })),
      ),
    );
    await this.load();
  }
}
