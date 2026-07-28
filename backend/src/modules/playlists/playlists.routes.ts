import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  addPlaylistItem,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  removePlaylistItem,
  updatePlaylist,
} from "./playlists.controller";

export const playlistsRouter = Router();

playlistsRouter.use(requireAuth);
playlistsRouter.get("/", listPlaylists);
playlistsRouter.get("/:id", getPlaylist);
playlistsRouter.post("/", requireRole(1, 2, 3), createPlaylist);
playlistsRouter.patch("/:id", requireRole(1, 2, 3), updatePlaylist);
playlistsRouter.delete("/:id", requireRole(1, 2, 3), deletePlaylist);
playlistsRouter.post("/:id/items", requireRole(1, 2, 3), addPlaylistItem);
playlistsRouter.delete("/:id/items/:itemId", requireRole(1, 2, 3), removePlaylistItem);
