import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { listAuditLogs } from "./audit.controller.js";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin));
auditRouter.get("/", listAuditLogs);
