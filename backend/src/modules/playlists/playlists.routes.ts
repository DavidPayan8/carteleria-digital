import { Router } from "express";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  addPlaylistItem,
  createPlaylist,
  deletePlaylist,
  duplicatePlaylist,
  getPlaylist,
  listPlaylists,
  removePlaylistItem,
  reorderPlaylistItems,
  updatePlaylist,
  updatePlaylistItem,
} from "./playlists.controller.js";

export const playlistsRouter = Router();

const canManage = requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin);

playlistsRouter.use(requireAuth);
playlistsRouter.get("/", listPlaylists);
playlistsRouter.get("/:id", getPlaylist);
playlistsRouter.post("/", canManage, createPlaylist);
playlistsRouter.post("/:id/duplicate", canManage, duplicatePlaylist);
playlistsRouter.patch("/:id", canManage, updatePlaylist);
playlistsRouter.delete("/:id", canManage, deletePlaylist);
playlistsRouter.post("/:id/items", canManage, addPlaylistItem);
playlistsRouter.post("/:id/items/reorder", canManage, reorderPlaylistItems);
playlistsRouter.patch("/:id/items/:itemId", canManage, updatePlaylistItem);
playlistsRouter.delete("/:id/items/:itemId", canManage, removePlaylistItem);
