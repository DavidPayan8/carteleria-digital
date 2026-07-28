import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../core/services/auth.service";
import { WorkspaceService } from "../core/services/workspace.service";
import { ROLE } from "../core/models/models";

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: number[];
}

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
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
      roles: [ROLE.SuperAdmin],
    },
    { label: "Restaurantes", path: "/locations", icon: "M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" },
    {
      label: "Auditoría",
      path: "/audit",
      icon: "M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7z",
      roles: [ROLE.SuperAdmin, ROLE.OrgAdmin],
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
