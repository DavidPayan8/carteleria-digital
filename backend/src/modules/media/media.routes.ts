import { Router } from "express";
import multer from "multer";
import { ROLE } from "../../config/roles.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { deleteMedia, listMedia, uploadMedia } from "./media.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB, ajustar según necesidad real de video
});

export const mediaRouter = Router();

mediaRouter.use(requireAuth);
mediaRouter.get("/", listMedia);
mediaRouter.post(
  "/",
  requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin),
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadMedia,
);
mediaRouter.delete("/:id", requireRole(ROLE.SuperAdmin, ROLE.OrgAdmin, ROLE.LocationAdmin), deleteMedia);
