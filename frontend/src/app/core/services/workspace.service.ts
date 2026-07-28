import { Injectable, computed, effect, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Location, Organization } from "../models/models";
import { AuthService } from "./auth.service";
import { LocationsService } from "./locations.service";
import { OrganizationsService } from "./organizations.service";

const ORG_KEY = "signageflow.selectedOrganizationId";
const LOCATION_KEY = "signageflow.selectedLocationId";

/**
 * Contexto global de "en qué franquicia/restaurante estoy trabajando ahora",
 * usado por las páginas de Pantallas, Media, Playlists y Programaciones.
 */
@Injectable({ providedIn: "root" })
export class WorkspaceService {
  readonly organizations = signal<Organization[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly selectedOrganizationId = signal<string | null>(localStorage.getItem(ORG_KEY));
  readonly selectedLocationId = signal<string | null>(localStorage.getItem(LOCATION_KEY));

  readonly selectedOrganization = computed(
    () => this.organizations().find((o) => o.id === this.selectedOrganizationId()) ?? null,
  );
  readonly selectedLocation = computed(
    () => this.locations().find((l) => l.id === this.selectedLocationId()) ?? null,
  );

  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly locationsService: LocationsService,
    private readonly auth: AuthService,
  ) {
    effect(() => {
      const id = this.selectedOrganizationId();
      if (id) localStorage.setItem(ORG_KEY, id);
      else localStorage.removeItem(ORG_KEY);
    });
    effect(() => {
      const id = this.selectedLocationId();
      if (id) localStorage.setItem(LOCATION_KEY, id);
      else localStorage.removeItem(LOCATION_KEY);
    });
  }

  async loadOrganizations(): Promise<void> {
    if (!this.auth.isAuthenticated()) return;
    const orgs = await firstValueFrom(this.organizationsService.list());
    this.organizations.set(orgs);
    if (!this.selectedOrganizationId() && orgs.length > 0) {
      this.selectOrganization(orgs[0].id);
    } else if (this.selectedOrganizationId()) {
      await this.loadLocations();
    }
  }

  async loadLocations(): Promise<void> {
    const orgId = this.selectedOrganizationId();
    if (!orgId) {
      this.locations.set([]);
      return;
    }
    const locations = await firstValueFrom(this.locationsService.list(orgId));
    this.locations.set(locations);
    if (!locations.some((l) => l.id === this.selectedLocationId())) {
      this.selectedLocationId.set(locations[0]?.id ?? null);
    }
  }

  selectOrganization(id: string): void {
    this.selectedOrganizationId.set(id);
    this.selectedLocationId.set(null);
    void this.loadLocations();
  }

  selectLocation(id: string): void {
    this.selectedLocationId.set(id);
  }
}
