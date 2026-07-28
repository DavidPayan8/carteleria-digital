import crypto from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAuditLog } from "../../utils/audit";
import { deleteBlob, getReadSasUrl, uploadBuffer } from "../../utils/azureBlob";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const uploadMetaSchema = z.object({
  organizationId: z.string().uuid(),
  durationSeconds: z.coerce.number().positive().optional(), // requerido para video si no se calcula server-side
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

function withSasUrl<T extends { blobContainer: string; blobPath: string; thumbnailBlobPath: string | null }>(
  media: T,
) {
  return {
    ...media,
    url: getReadSasUrl({
      containerName: media.blobContainer,
      blobPath: media.blobPath,
      expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
    }),
    thumbnailUrl: media.thumbnailBlobPath
      ? getReadSasUrl({
          containerName: media.blobContainer,
          blobPath: media.thumbnailBlobPath,
          expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
        })
      : null,
  };
}

export const listMedia = asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId as string | undefined;
  const media = await prisma.media.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  res.json(media.map(withSasUrl));
});

export const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Falta el archivo (campo 'file')" });
    return;
  }

  const meta = uploadMetaSchema.parse(req.body);

  const isImage = IMAGE_MIME.has(file.mimetype);
  const isVideo = VIDEO_MIME.has(file.mimetype);
  if (!isImage && !isVideo) {
    res.status(400).json({ error: `Tipo de archivo no soportado: ${file.mimetype}` });
    return;
  }
  if (isVideo && meta.durationSeconds === undefined) {
    res.status(400).json({ error: "durationSeconds es obligatorio para video" });
    return;
  }

  const blobPath = `${meta.organizationId}/${crypto.randomUUID()}${path.extname(file.originalname)}`;

  await uploadBuffer({
    containerName: env.AZURE_STORAGE_CONTAINER,
    blobPath,
    buffer: file.buffer,
    contentType: file.mimetype,
  });

  const media = await prisma.media.create({
    data: {
      organizationId: meta.organizationId,
      type: isVideo ? 1 : 0,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: BigInt(file.size),
      blobContainer: env.AZURE_STORAGE_CONTAINER,
      blobPath,
      durationSeconds: meta.durationSeconds,
      width: meta.width,
      height: meta.height,
      uploadedByUserId: req.user?.userId,
    },
  });

  res.status(201).json(withSasUrl(media));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const media = await prisma.$transaction(async (tx) => {
    const existing = await tx.media.findUniqueOrThrow({ where: { id } });
    await recordAuditLog(tx, {
      entityName: "Media",
      entityId: id,
      organizationId: existing.organizationId,
      performedByUserId: req.user?.userId,
      data: existing,
    });
    // PlaylistItems que referencian este media se borran en cascada por FK;
    // si la FK no es ON DELETE CASCADE en la BD, hazlo explícito aquí:
    await tx.playlistItem.deleteMany({ where: { mediaId: id } });
    await tx.media.delete({ where: { id } });
    return existing;
  });

  await deleteBlob({ containerName: media.blobContainer, blobPath: media.blobPath });
  if (media.thumbnailBlobPath) {
    await deleteBlob({ containerName: media.blobContainer, blobPath: media.thumbnailBlobPath });
  }

  res.status(204).send();
});
