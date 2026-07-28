import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { Location } from "../../core/models/models";
import { LocationsService } from "../../core/services/locations.service";
import { WorkspaceService } from "../../core/services/workspace.service";

@Component({
  selector: "app-locations",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./locations.html",
})
export class LocationsPage implements OnInit {
  readonly locations = signal<Location[]>([]);
  readonly showForm = signal(false);
  name = "";
  address = "";
  timeZone = "Europe/Madrid";

  constructor(
    private readonly locationsService: LocationsService,
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
    const orgId = this.workspace.selectedOrganizationId();
    if (!orgId) return;
    this.locations.set(await firstValueFrom(this.locationsService.list(orgId)));
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

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar este restaurante? Esta acción es irreversible.")) return;
    await firstValueFrom(this.locationsService.delete(id));
    await this.load();
    await this.workspace.loadLocations();
  }
}
