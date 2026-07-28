import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Playlist } from "../../core/models/models";
import { PlaylistsService } from "../../core/services/playlists.service";
import { WorkspaceService } from "../../core/services/workspace.service";

@Component({
  selector: "app-playlists-list",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./playlists-list.html",
})
export class PlaylistsList implements OnInit {
  readonly playlists = signal<Playlist[]>([]);
  readonly showForm = signal(false);
  name = "";
  scopeToLocation = true;

  constructor(
    private readonly playlistsService: PlaylistsService,
    readonly workspace: WorkspaceService,
  ) {
    effect(() => {
      if (this.workspace.selectedOrganizationId()) void this.load();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const organizationId = this.workspace.selectedOrganizationId();
    if (!organizationId) return;
    this.playlists.set(await firstValueFrom(this.playlistsService.list({ organizationId })));
  }

  async create(): Promise<void> {
    const organizationId = this.workspace.selectedOrganizationId();
    const locationId = this.workspace.selectedLocationId();
    if (!organizationId || !this.name) return;
    await firstValueFrom(
      this.playlistsService.create({
        organizationId,
        locationId: this.scopeToLocation && locationId ? locationId : undefined,
        name: this.name,
      }),
    );
    this.name = "";
    this.showForm.set(false);
    await this.load();
  }

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar esta playlist? También se borrarán sus programaciones.")) return;
    await firstValueFrom(this.playlistsService.delete(id));
    await this.load();
  }
}
