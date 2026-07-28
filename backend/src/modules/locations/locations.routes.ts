import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createLocation,
  deleteLocation,
  getLocation,
  listLocations,
  updateLocation,
} from "./locations.controller";

// SuperAdmin y OrgAdmin gestionan restaurantes. TODO: restringir OrgAdmin a su propia organizationId
// una vez se defina el middleware de scoping multi-tenant (fase 4 del plan).
export const locationsRouter = Router();

locationsRouter.use(requireAuth);
locationsRouter.get("/", listLocations);
locationsRouter.get("/:id", getLocation);
locationsRouter.post("/", requireRole(1, 2), createLocation);
locationsRouter.patch("/:id", requireRole(1, 2), updateLocation);
locationsRouter.delete("/:id", requireRole(1, 2), deleteLocation);
