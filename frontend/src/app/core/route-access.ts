import { ROLE } from "./models/models";

// Fuente única de qué roles pueden acceder a cada sección restringida — la usan tanto
// el guard de rutas (app.routes.ts) como el menú lateral (layout/shell.ts) para que
// ambos se mantengan siempre en sincronía.
export const ROUTE_ROLES = {
  organizations: [ROLE.SuperAdmin],
  locations: [ROLE.SuperAdmin, ROLE.OrgAdmin],
  audit: [ROLE.SuperAdmin, ROLE.OrgAdmin],
  users: [ROLE.SuperAdmin, ROLE.OrgAdmin],
} as const;
