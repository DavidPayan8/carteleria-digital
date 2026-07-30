import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { ROLE, Organization } from "../../core/models/models";
import { AuthService } from "../../core/services/auth.service";
import { OrganizationsService } from "../../core/services/organizations.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-organizations",
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: "./organizations.html",
})
export class Organizations implements OnInit {
  readonly organizations = signal<Organization[]>([]);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly loading = signal(false);
  name = "";
  slug = "";
  editName = "";
  editSlug = "";

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly confirmDialog: ConfirmDialogService,
    private readonly workspace: WorkspaceService,
    readonly auth: AuthService,
  ) {}

  get canEdit(): boolean {
    // Solo SuperAdmin gestiona franquicias (igual que ya exige el backend).
    return this.auth.hasRole(ROLE.SuperAdmin);
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.organizations.set(await firstValueFrom(this.organizationsService.list()));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    if (!this.name || !this.slug) return;
    await firstValueFrom(this.organizationsService.create({ name: this.name, slug: this.slug }));
    this.name = "";
    this.slug = "";
    this.showForm.set(false);
    await this.load();
    await this.workspace.loadOrganizations();
  }

  startEdit(org: Organization): void {
    this.editingId.set(org.id);
    this.editName = org.name;
    this.editSlug = org.slug;
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  async saveEdit(id: string): Promise<void> {
    if (!this.editName || !this.editSlug) return;
    await firstValueFrom(this.organizationsService.update(id, { name: this.editName, slug: this.editSlug }));
    this.editingId.set(null);
    await this.load();
    await this.workspace.loadOrganizations();
  }

  async remove(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar esta organización? Esta acción es irreversible.",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.organizationsService.delete(id));
    await this.load();
    await this.workspace.loadOrganizations();
  }
}
