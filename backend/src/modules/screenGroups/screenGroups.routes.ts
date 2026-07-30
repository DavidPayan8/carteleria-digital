import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createScreenGroup,
  deleteScreenGroup,
  listScreenGroups,
  updateScreenGroup,
} from "./screenGroups.controller.js";

export const screenGroupsRouter = Router();
const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin);

screenGroupsRouter.use(requireAuth);
screenGroupsRouter.get("/", listScreenGroups);
screenGroupsRouter.post("/", canManage, createScreenGroup);
screenGroupsRouter.patch("/:id", canManage, updateScreenGroup);
screenGroupsRouter.delete("/:id", canManage, deleteScreenGroup);
