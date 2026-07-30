
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Playlist } from "../../core/models/models";
import { PlaylistsService } from "../../core/services/playlists.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-playlists-list",
  standalone: true,
  imports: [FormsModule, RouterLink, SpinnerComponent],
  templateUrl: "./playlists-list.html",
})
export class PlaylistsList implements OnInit {
  readonly playlists = signal<Playlist[]>([]);
  readonly showForm = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  name = "";
  scopeToLocation = true;

  constructor(
    private readonly playlistsService: PlaylistsService,
    private readonly confirmDialog: ConfirmDialogService,
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
    this.loading.set(true);
    try {
      this.playlists.set(await firstValueFrom(this.playlistsService.list({ organizationId })));
    } finally {
      this.loading.set(false);
    }
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
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar esta playlist? También se borrarán sus programaciones.",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.playlistsService.delete(id));
    await this.load();
  }

  async duplicate(id: string): Promise<void> {
    this.error.set(null);
    try {
      await firstValueFrom(this.playlistsService.duplicate(id));
      await this.load();
    } catch {
      this.error.set("No se pudo duplicar la playlist.");
    }
  }
}
