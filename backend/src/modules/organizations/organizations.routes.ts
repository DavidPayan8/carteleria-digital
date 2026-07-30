import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from "./organizations.controller.js";

// Cualquier usuario autenticado puede LEER su propia organización (o todas si es SuperAdmin) —
// el controller aplica el scoping. Solo SuperAdmin gestiona franquicias (crear/editar/borrar).
export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);
organizationsRouter.get("/", listOrganizations);
organizationsRouter.get("/:id", getOrganization);
organizationsRouter.post("/", requireRole(ROLE.SuperAdmin), createOrganization);
organizationsRouter.patch("/:id", requireRole(ROLE.SuperAdmin), updateOrganization);
organizationsRouter.delete("/:id", requireRole(ROLE.SuperAdmin), deleteOrganization);
