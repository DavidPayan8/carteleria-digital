import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { createSchedule, deleteSchedule, listSchedules, updateSchedule } from "./schedules.controller.js";

export const schedulesRouter = Router();

const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin);

schedulesRouter.use(requireAuth);
schedulesRouter.get("/", listSchedules);
schedulesRouter.post("/", canManage, createSchedule);
schedulesRouter.patch("/:id", canManage, updateSchedule);
schedulesRouter.delete("/:id", canManage, deleteSchedule);
