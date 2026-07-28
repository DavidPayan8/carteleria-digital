import { Router } from "express";
import { requireScreenAuth } from "../../middleware/screenAuth";
import { getCurrentPlaylist } from "./player.controller";

export const playerRouter = Router();

playerRouter.use(requireScreenAuth);
playerRouter.get("/current-playlist", getCurrentPlaylist);
