import crypto from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { assertOrganizationAccess, getScope, scopedOrganizationId } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";
import { deleteBlob, getReadSasUrl, uploadBuffer } from "../../utils/azureBlob.js";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const uploadMetaSchema = z.object({
  organizationId: z.string().uuid(),
  durationSeconds: z.coerce.number().positive().optional(), // requerido para video si no se calcula server-side
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export async function withSasUrl<T extends { blobContainer: string; blobPath: string; thumbnailBlobPath: string | null }>(
  media: T,
) {
  return {
    ...media,
    url: await getReadSasUrl({
      containerName: media.blobContainer,
      blobPath: media.blobPath,
      expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
    }),
    thumbnailUrl: media.thumbnailBlobPath
      ? await getReadSasUrl({
          containerName: media.blobContainer,
          blobPath: media.thumbnailBlobPath,
          expiryMinutes: env.SAS_URL_EXPIRY_MINUTES,
        })
      : null,
  };
}

export const listMedia = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const organizationId = scopedOrganizationId(scope, req.query.organizationId as string | undefined);
  const media = await prisma.media.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  res.json(await Promise.all(media.map(withSasUrl)));
});

export const uploadMedia = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const file = files?.file?.[0];
  const thumbnailFile = files?.thumbnail?.[0];
  if (!file) {
    res.status(400).json({ error: "Falta el archivo (campo 'file')" });
    return;
  }

  const meta = uploadMetaSchema.parse(req.body);
  assertOrganizationAccess(scope, meta.organizationId);

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

  let thumbnailBlobPath: string | undefined;
  if (thumbnailFile) {
    thumbnailBlobPath = `${meta.organizationId}/${crypto.randomUUID()}-thumb.jpg`;
    await uploadBuffer({
      containerName: env.AZURE_STORAGE_CONTAINER,
      blobPath: thumbnailBlobPath,
      buffer: thumbnailFile.buffer,
      contentType: thumbnailFile.mimetype,
    });
  }

  const media = await prisma.media.create({
    data: {
      organizationId: meta.organizationId,
      type: isVideo ? 1 : 0,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: BigInt(file.size),
      blobContainer: env.AZURE_STORAGE_CONTAINER,
      blobPath,
      thumbnailBlobPath,
      durationSeconds: meta.durationSeconds,
      width: meta.width,
      height: meta.height,
      uploadedByUserId: req.user?.userId,
    },
  });

  res.status(201).json(await withSasUrl(media));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;

  const media = await prisma.$transaction(async (tx) => {
    const existing = await tx.media.findUniqueOrThrow({ where: { id } });
    assertOrganizationAccess(scope, existing.organizationId);
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
