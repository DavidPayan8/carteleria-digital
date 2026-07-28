import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createSchedule, deleteSchedule, listSchedules, updateSchedule } from "./schedules.controller";

export const schedulesRouter = Router();

schedulesRouter.use(requireAuth);
schedulesRouter.get("/", listSchedules);
schedulesRouter.post("/", requireRole(1, 2, 3), createSchedule);
schedulesRouter.patch("/:id", requireRole(1, 2, 3), updateSchedule);
schedulesRouter.delete("/:id", requireRole(1, 2, 3), deleteSchedule);
