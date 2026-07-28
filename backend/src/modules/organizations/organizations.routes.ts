import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from "./organizations.controller";

// Solo SuperAdmin (roleId 1) gestiona franquicias.
export const organizationsRouter = Router();

organizationsRouter.use(requireAuth, requireRole(1));
organizationsRouter.get("/", listOrganizations);
organizationsRouter.get("/:id", getOrganization);
organizationsRouter.post("/", createOrganization);
organizationsRouter.patch("/:id", updateOrganization);
organizationsRouter.delete("/:id", deleteOrganization);
