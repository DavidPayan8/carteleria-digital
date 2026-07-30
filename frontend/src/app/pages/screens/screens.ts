import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Screen, ScreenGroup } from "../../core/models/models";
import { ScreenGroupsService } from "../../core/services/screen-groups.service";
import { ScreensService } from "../../core/services/screens.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

@Component({
  selector: "app-screens",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SpinnerComponent],
  templateUrl: "./screens.html",
})
export class Screens implements OnInit {
  readonly screens = signal<Screen[]>([]);
  readonly groups = signal<ScreenGroup[]>([]);
  readonly showForm = signal(false);
  readonly showGroupForm = signal(false);
  readonly lastPairing = signal<{ screenName: string; code: string; expiresAt: string } | null>(null);
  readonly loading = signal(false);
  readonly groupError = signal<string | null>(null);
  name = "";
  orientation = 0;
  screenGroupId = "";
  newGroupName = "";
  editingGroupId: string | null = null;
  editingGroupName = "";

  constructor(
    private readonly screensService: ScreensService,
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

  isOnline = isOnline;

  private async load(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId) return;
    this.loading.set(true);
    try {
      const [screens, groups] = await Promise.all([
        firstValueFrom(this.screensService.list(locationId)),
        firstValueFrom(this.screenGroupsService.list(locationId)),
      ]);
      this.screens.set(screens);
      this.groups.set(groups);
    } finally {
      this.loading.set(false);
    }
  }

  groupName(id: string | null): string {
    if (!id) return "Sin grupo";
    return this.groups().find((g) => g.id === id)?.name ?? "Sin grupo";
  }

  async create(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId || !this.name) return;
    const screen = await firstValueFrom(
      this.screensService.create({
        locationId,
        name: this.name,
        orientation: this.orientation,
        screenGroupId: this.screenGroupId || undefined,
      }),
    );
    this.name = "";
    this.screenGroupId = "";
    this.showForm.set(false);
    if (screen.pairingCode && screen.pairingCodeExpiresAt) {
      this.lastPairing.set({ screenName: screen.name, code: screen.pairingCode, expiresAt: screen.pairingCodeExpiresAt });
    }
    await this.load();
  }

  async assignGroup(screen: Screen, groupId: string): Promise<void> {
    await firstValueFrom(this.screensService.update(screen.id, { screenGroupId: groupId || null }));
    await this.load();
  }

  async createGroup(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId || !this.newGroupName.trim()) return;
    this.groupError.set(null);
    try {
      await firstValueFrom(this.screenGroupsService.create(locationId, this.newGroupName.trim()));
      this.newGroupName = "";
      this.showGroupForm.set(false);
      await this.load();
    } catch {
      this.groupError.set("No se pudo crear el grupo.");
    }
  }

  startEditGroup(group: ScreenGroup): void {
    this.editingGroupId = group.id;
    this.editingGroupName = group.name;
  }

  cancelEditGroup(): void {
    this.editingGroupId = null;
    this.editingGroupName = "";
  }

  async saveGroup(): Promise<void> {
    if (!this.editingGroupId || !this.editingGroupName.trim()) return;
    this.groupError.set(null);
    try {
      await firstValueFrom(this.screenGroupsService.update(this.editingGroupId, this.editingGroupName.trim()));
      this.cancelEditGroup();
      await this.load();
    } catch {
      this.groupError.set("No se pudo renombrar el grupo.");
    }
  }

  async removeGroup(group: ScreenGroup): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: `¿Borrar el grupo "${group.name}"? Las pantallas quedarán sin grupo y sus programaciones dirigidas al grupo se eliminarán.`,
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.screenGroupsService.delete(group.id));
    await this.load();
  }

  async regenerateCode(screen: Screen): Promise<void> {
    const result = await firstValueFrom(this.screensService.regeneratePairingCode(screen.id));
    this.lastPairing.set({ screenName: screen.name, code: result.pairingCode, expiresAt: result.expiresAt });
    await this.load();
  }

  async unpair(screen: Screen): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: `¿Desemparejar "${screen.name}"? El player dejará de recibir programación hasta volver a emparejarla.`,
      confirmText: "Desemparejar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.screensService.unpair(screen.id));
    await this.load();
  }

  async remove(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar esta pantalla?",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.screensService.delete(id));
    await this.load();
  }
}
