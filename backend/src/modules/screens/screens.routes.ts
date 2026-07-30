import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createScreen,
  deleteScreen,
  getScreen,
  listScreens,
  pairScreen,
  regeneratePairingCode,
  unpairScreen,
  updateScreen,
} from "./screens.controller.js";

export const screensRouter = Router();

// Sin auth: lo usa el dispositivo antes de tener token propio.
screensRouter.post("/pair", pairScreen);

const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin);

screensRouter.use(requireAuth);
screensRouter.get("/", listScreens);
screensRouter.get("/:id", getScreen);
screensRouter.post("/", canManage, createScreen);
screensRouter.patch("/:id", canManage, updateScreen);
screensRouter.post("/:id/pairing-code", canManage, regeneratePairingCode);
screensRouter.post("/:id/unpair", canManage, unpairScreen);
screensRouter.delete("/:id", canManage, deleteScreen);
