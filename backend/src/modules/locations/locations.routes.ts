import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createLocation,
  deleteLocation,
  getLocation,
  listLocations,
  updateLocation,
} from "./locations.controller.js";

// SuperAdmin y OrgAdmin gestionan restaurantes; el scoping multi-tenant (OrgAdmin restringido a su
// propia organización, LocationAdmin a sus locations) se aplica en locations.controller.ts.
export const locationsRouter = Router();

const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin);

locationsRouter.use(requireAuth);
locationsRouter.get("/", listLocations);
locationsRouter.get("/:id", getLocation);
locationsRouter.post("/", canManage, createLocation);
locationsRouter.patch("/:id", canManage, updateLocation);
locationsRouter.delete("/:id", canManage, deleteLocation);
