import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listAuditLogs } from "./audit.controller";

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole(1, 2));
auditRouter.get("/", listAuditLogs);
