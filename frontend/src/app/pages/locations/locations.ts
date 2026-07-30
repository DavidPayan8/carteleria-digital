
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { Location, ROLE } from "../../core/models/models";
import { AuthService } from "../../core/services/auth.service";
import { LocationsService } from "../../core/services/locations.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-locations",
  standalone: true,
  imports: [FormsModule, SpinnerComponent],
  templateUrl: "./locations.html",
})
export class LocationsPage implements OnInit {
  readonly locations = signal<Location[]>([]);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly loading = signal(false);
  name = "";
  address = "";
  timeZone = "Europe/Madrid";
  editName = "";
  editAddress = "";
  editTimeZone = "";

  constructor(
    private readonly locationsService: LocationsService,
    private readonly confirmDialog: ConfirmDialogService,
    readonly workspace: WorkspaceService,
    readonly auth: AuthService,
  ) {
    effect(() => {
      if (this.workspace.selectedOrganizationId()) void this.load();
    });
  }

  get canEdit(): boolean {
    // SuperAdmin y OrgAdmin gestionan restaurantes (igual que ya exige el backend).
    return this.auth.hasRole(ROLE.SuperAdmin, ROLE.OrgAdmin);
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const orgId = this.workspace.selectedOrganizationId();
    if (!orgId) return;
    this.loading.set(true);
    try {
      this.locations.set(await firstValueFrom(this.locationsService.list(orgId)));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const orgId = this.workspace.selectedOrganizationId();
    if (!orgId || !this.name) return;
    await firstValueFrom(
      this.locationsService.create({ organizationId: orgId, name: this.name, address: this.address, timeZone: this.timeZone }),
    );
    this.name = "";
    this.address = "";
    this.showForm.set(false);
    await this.load();
    await this.workspace.loadLocations();
  }

  startEdit(loc: Location): void {
    this.editingId.set(loc.id);
    this.editName = loc.name;
    this.editAddress = loc.address ?? "";
    this.editTimeZone = loc.timeZone;
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  async saveEdit(id: string): Promise<void> {
    if (!this.editName) return;
    await firstValueFrom(
      this.locationsService.update(id, { name: this.editName, address: this.editAddress, timeZone: this.editTimeZone }),
    );
    this.editingId.set(null);
    await this.load();
    await this.workspace.loadLocations();
  }

  async remove(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar este restaurante? Esta acción es irreversible.",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.locationsService.delete(id));
    await this.load();
    await this.workspace.loadLocations();
  }
}
