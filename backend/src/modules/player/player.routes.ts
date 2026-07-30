import { Router } from "express";
import { requireScreenAuth } from "../../middleware/screenAuth.js";
import { getCurrentPlaylist } from "./player.controller.js";

export const playerRouter = Router();

playerRouter.use(requireScreenAuth);
playerRouter.get("/current-playlist", getCurrentPlaylist);
