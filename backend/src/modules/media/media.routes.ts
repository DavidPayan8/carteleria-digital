import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middleware/auth";
import { deleteMedia, listMedia, uploadMedia } from "./media.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB, ajustar según necesidad real de video
});

export const mediaRouter = Router();

mediaRouter.use(requireAuth);
mediaRouter.get("/", listMedia);
mediaRouter.post("/", requireRole(1, 2, 3), upload.single("file"), uploadMedia);
mediaRouter.delete("/:id", requireRole(1, 2, 3), deleteMedia);
