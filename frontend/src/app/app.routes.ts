import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { roleGuard } from "./core/guards/role.guard";
import { ROUTE_ROLES } from "./core/route-access";
import { Shell } from "./layout/shell";

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./pages/login/login").then((m) => m.Login),
  },
  {
    path: "",
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "dashboard" },
      {
        path: "dashboard",
        loadComponent: () => import("./pages/dashboard/dashboard").then((m) => m.Dashboard),
      },
      {
        path: "organizations",
        loadComponent: () => import("./pages/organizations/organizations").then((m) => m.Organizations),
        canActivate: [roleGuard],
        data: { roles: ROUTE_ROLES.organizations },
      },
      {
        path: "locations",
        loadComponent: () => import("./pages/locations/locations").then((m) => m.LocationsPage),
        canActivate: [roleGuard],
        data: { roles: ROUTE_ROLES.locations },
      },
      {
        path: "screens",
        loadComponent: () => import("./pages/screens/screens").then((m) => m.Screens),
      },
      {
        path: "screens/:id/layout",
        loadComponent: () =>
          import("./pages/screens/layout-editor/layout-editor").then((m) => m.ScreenLayoutEditor),
      },
      {
        path: "media",
        loadComponent: () => import("./pages/media/media").then((m) => m.MediaLibrary),
      },
      {
        path: "playlists",
        loadComponent: () => import("./pages/playlists/playlists-list").then((m) => m.PlaylistsList),
      },
      {
        path: "playlists/:id",
        loadComponent: () => import("./pages/playlists/playlist-editor").then((m) => m.PlaylistEditor),
      },
      {
        path: "schedules",
        loadComponent: () => import("./pages/schedules/schedules").then((m) => m.Schedules),
      },
      {
        path: "audit",
        loadComponent: () => import("./pages/audit/audit").then((m) => m.Audit),
        canActivate: [roleGuard],
        data: { roles: ROUTE_ROLES.audit },
      },
      {
        path: "users",
        loadComponent: () => import("./pages/users/users").then((m) => m.UsersPage),
        canActivate: [roleGuard],
        data: { roles: ROUTE_ROLES.users },
      },
      {
        path: "account",
        loadComponent: () => import("./pages/account/account").then((m) => m.AccountPage),
      },
      {
        path: "unauthorized",
        loadComponent: () => import("./pages/unauthorized/unauthorized").then((m) => m.Unauthorized),
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
