import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createScreen,
  deleteScreen,
  getScreen,
  listScreens,
  pairScreen,
  regeneratePairingCode,
  updateScreen,
} from "./screens.controller";

export const screensRouter = Router();

// Sin auth: lo usa el dispositivo antes de tener token propio.
screensRouter.post("/pair", pairScreen);

screensRouter.use(requireAuth);
screensRouter.get("/", listScreens);
screensRouter.get("/:id", getScreen);
screensRouter.post("/", requireRole(1, 2, 3), createScreen);
screensRouter.patch("/:id", requireRole(1, 2, 3), updateScreen);
screensRouter.post("/:id/pairing-code", requireRole(1, 2, 3), regeneratePairingCode);
screensRouter.delete("/:id", requireRole(1, 2, 3), deleteScreen);
