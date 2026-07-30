import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { Location as LocationModel, ManagedUser, ROLE, ROLE_LABELS } from "../../core/models/models";
import { AuthService } from "../../core/services/auth.service";
import { LocationsService } from "../../core/services/locations.service";
import { CreateUserInput, UpdateUserInput, UsersService } from "../../core/services/users.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

interface RoleOption {
  id: number;
  label: string;
}

const ALL_ROLES: RoleOption[] = [
  { id: ROLE.SuperAdmin, label: "SuperAdmin" },
  { id: ROLE.OrgAdmin, label: "OrgAdmin" },
  { id: ROLE.LocationAdmin, label: "LocationAdmin" },
  { id: ROLE.Viewer, label: "Viewer" },
];

@Component({
  selector: "app-users",
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: "./users.html",
})
export class UsersPage implements OnInit {
  readonly ROLE = ROLE;
  readonly roleLabels = ROLE_LABELS;

  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(false);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formLocations = signal<LocationModel[]>([]);
  readonly editingId = signal<string | null>(null);

  email = "";
  password = "";
  fullName = "";
  roleId: number = ROLE.Viewer;
  organizationId = "";
  locationId = "";

  constructor(
    private readonly usersService: UsersService,
    private readonly locationsService: LocationsService,
    private readonly confirmDialog: ConfirmDialogService,
    readonly auth: AuthService,
    readonly workspace: WorkspaceService,
  ) {}

  get isSuperAdmin(): boolean {
    return this.auth.hasRole(ROLE.SuperAdmin);
  }

  get availableRoles(): RoleOption[] {
    return this.isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter((r) => r.id !== ROLE.SuperAdmin);
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await firstValueFrom(this.usersService.list()));
    } finally {
      this.loading.set(false);
    }
  }

  organizationName(id: string | null): string {
    if (!id) return "—";
    return this.workspace.organizations().find((o) => o.id === id)?.name ?? id;
  }

  roleSummary(user: ManagedUser): string {
    return user.roles.map((r) => this.roleLabels[r.roleId] ?? r.roleId).join(", ");
  }

  openCreateForm(): void {
    if (this.showForm() && !this.editingId()) {
      this.showForm.set(false);
      return;
    }
    this.error.set(null);
    this.editingId.set(null);
    this.email = "";
    this.password = "";
    this.fullName = "";
    this.roleId = ROLE.Viewer;
    this.organizationId = this.isSuperAdmin ? "" : (this.workspace.selectedOrganizationId() ?? "");
    this.locationId = "";
    this.formLocations.set([]);
    if (this.organizationId) void this.loadLocationsFor(this.organizationId);
    this.showForm.set(true);
  }

  startEdit(user: ManagedUser): void {
    this.error.set(null);
    this.editingId.set(user.id);
    this.email = user.email;
    this.password = "";
    this.fullName = user.fullName;
    const role = user.roles[0];
    this.roleId = role?.roleId ?? ROLE.Viewer;
    this.organizationId = user.organizationId ?? "";
    this.locationId = role?.locationId ?? "";
    this.formLocations.set([]);
    if (this.organizationId) void this.loadLocationsFor(this.organizationId);
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  async onOrganizationChange(): Promise<void> {
    this.locationId = "";
    await this.loadLocationsFor(this.organizationId);
  }

  onRoleChange(): void {
    if (this.roleId === ROLE.SuperAdmin) {
      this.locationId = "";
    }
  }

  private async loadLocationsFor(organizationId: string): Promise<void> {
    if (!organizationId) {
      this.formLocations.set([]);
      return;
    }
    this.formLocations.set(await firstValueFrom(this.locationsService.list(organizationId)));
  }

  async save(): Promise<void> {
    this.error.set(null);
    const editingId = this.editingId();
    if (!editingId && (!this.email || !this.password)) return;
    if (!this.fullName) return;
    if (this.roleId !== ROLE.SuperAdmin && !this.organizationId) {
      this.error.set("Selecciona una organización.");
      return;
    }
    if (this.roleId === ROLE.LocationAdmin && !this.locationId) {
      this.error.set("Selecciona un restaurante para el LocationAdmin.");
      return;
    }

    this.saving.set(true);
    try {
      if (editingId) {
        const payload: UpdateUserInput = {
          fullName: this.fullName,
          password: this.password || undefined,
          roleId: this.roleId,
          locationId: this.roleId === ROLE.LocationAdmin ? this.locationId : undefined,
        };
        await firstValueFrom(this.usersService.update(editingId, payload));
      } else {
        const payload: CreateUserInput = {
          email: this.email,
          password: this.password,
          fullName: this.fullName,
          roleId: this.roleId,
          organizationId: this.roleId === ROLE.SuperAdmin ? undefined : this.organizationId,
          locationId: this.roleId === ROLE.LocationAdmin ? this.locationId : undefined,
        };
        await firstValueFrom(this.usersService.create(payload));
      }
      this.cancelForm();
      await this.load();
    } catch (err) {
      this.error.set(
        this.extractError(err) ?? (editingId ? "No se pudo guardar los cambios." : "No se pudo crear el usuario."),
      );
    } finally {
      this.saving.set(false);
    }
  }

  async remove(user: ManagedUser): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: `¿Borrar el usuario "${user.email}"?`,
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.usersService.delete(user.id));
      await this.load();
    } catch (err) {
      this.error.set(this.extractError(err) ?? "No se pudo borrar el usuario.");
    }
  }

  private extractError(err: unknown): string | null {
    if (err && typeof err === "object" && "error" in err) {
      const body = (err as { error?: { error?: string } }).error;
      return body?.error ?? null;
    }
    return null;
  }
}
