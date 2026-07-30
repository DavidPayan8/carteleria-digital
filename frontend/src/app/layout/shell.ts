
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { WorkspaceService } from "../core/services/workspace.service";
import { ROUTE_ROLES } from "../core/route-access";

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: number[];
}

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: "./shell.html",
})
export class Shell implements OnInit {
  readonly navItems: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
    { label: "Pantallas", path: "/screens", icon: "M4 5h16v10H4zM9 19h6M12 15v4" },
    { label: "Media Library", path: "/media", icon: "M4 4h16v16H4zM4 15l4-4 4 4 4-6 4 4" },
    { label: "Playlists", path: "/playlists", icon: "M4 6h16M4 12h16M4 18h10" },
    { label: "Programaciones", path: "/schedules", icon: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4" },
    {
      label: "Organizaciones",
      path: "/organizations",
      icon: "M4 21V5a2 2 0 012-2h4v18M14 21V9h6a2 2 0 012 2v10",
      roles: [...ROUTE_ROLES.organizations],
    },
    {
      label: "Restaurantes",
      path: "/locations",
      icon: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z",
      roles: [...ROUTE_ROLES.locations],
    },
    {
      label: "Auditoría",
      path: "/audit",
      icon: "M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z",
      roles: [...ROUTE_ROLES.audit],
    },
    {
      label: "Usuarios",
      path: "/users",
      icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M11 3a4 4 0 110 8 4 4 0 010-8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
      roles: [...ROUTE_ROLES.users],
    },
  ];

  constructor(
    readonly auth: AuthService,
    readonly workspace: WorkspaceService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.workspace.loadOrganizations();
  }

  visibleNavItems(): NavItem[] {
    return this.navItems.filter((item) => !item.roles || this.auth.hasRole(...item.roles));
  }

  onOrganizationChange(id: string): void {
    this.workspace.selectOrganization(id);
  }

  onLocationChange(id: string): void {
    this.workspace.selectLocation(id);
  }

  logout(): void {
    this.auth.logout();
  }
}
