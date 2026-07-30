import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createScreenZone,
  deleteScreenZone,
  listScreenZones,
  updateScreenZone,
} from "./screenZones.controller.js";

// Mismos roles que gestionan Pantallas (SuperAdmin, OrgAdmin, LocationAdmin).
export const screenZonesRouter = Router();

screenZonesRouter.use(requireAuth);
screenZonesRouter.get("/", listScreenZones);
screenZonesRouter.post("/", requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin), createScreenZone);
screenZonesRouter.patch("/:id", requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin), updateScreenZone);
screenZonesRouter.delete("/:id", requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin), deleteScreenZone);
