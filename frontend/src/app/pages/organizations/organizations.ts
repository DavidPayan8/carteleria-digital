import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { Organization } from "../../core/models/models";
import { OrganizationsService } from "../../core/services/organizations.service";
import { WorkspaceService } from "../../core/services/workspace.service";

@Component({
  selector: "app-organizations",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./organizations.html",
})
export class Organizations implements OnInit {
  readonly organizations = signal<Organization[]>([]);
  readonly showForm = signal(false);
  name = "";
  slug = "";

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly workspace: WorkspaceService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.organizations.set(await firstValueFrom(this.organizationsService.list()));
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

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar esta organización? Esta acción es irreversible.")) return;
    await firstValueFrom(this.organizationsService.delete(id));
    await this.load();
    await this.workspace.loadOrganizations();
  }
}
