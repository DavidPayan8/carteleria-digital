import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
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
      },
      {
        path: "locations",
        loadComponent: () => import("./pages/locations/locations").then((m) => m.LocationsPage),
      },
      {
        path: "screens",
        loadComponent: () => import("./pages/screens/screens").then((m) => m.Screens),
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
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
