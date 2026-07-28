import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAuditLog } from "../../utils/audit";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(), // omitido = plantilla a nivel organización
  name: z.string().min(1),
  defaultItemDurationSeconds: z.number().int().positive().optional(),
});

const updateSchema = createSchema.partial().omit({ organizationId: true });

const addItemSchema = z.object({
  mediaId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  durationSecondsOverride: z.number().int().positive().optional(),
  transitionType: z.string().min(1).optional(),
});

export const listPlaylists = asyncHandler(async (req, res) => {
  const { organizationId, locationId } = req.query as { organizationId?: string; locationId?: string };
  const playlists = await prisma.playlist.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(playlists);
});

export const getPlaylist = asyncHandler(async (req, res) => {
  const playlist = await prisma.playlist.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
  });
  res.json(playlist);
});

export const createPlaylist = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const playlist = await prisma.playlist.create({ data });
  res.status(201).json(playlist);
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const playlist = await prisma.playlist.update({ where: { id: req.params.id }, data });
  res.json(playlist);
});

export const deletePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const playlist = await tx.playlist.findUniqueOrThrow({ where: { id } });
    await recordAuditLog(tx, {
      entityName: "Playlist",
      entityId: id,
      organizationId: playlist.organizationId,
      performedByUserId: req.user?.userId,
      data: playlist,
    });
    await tx.schedule.deleteMany({ where: { playlistId: id } });
    await tx.playlistItem.deleteMany({ where: { playlistId: id } });
    await tx.playlist.delete({ where: { id } });
  });
  res.status(204).send();
});

export const addPlaylistItem = asyncHandler(async (req, res) => {
  const data = addItemSchema.parse(req.body);
  const item = await prisma.playlistItem.create({
    data: { ...data, playlistId: req.params.id },
  });
  res.status(201).json(item);
});

export const removePlaylistItem = asyncHandler(async (req, res) => {
  await prisma.playlistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

const updateItemSchema = addItemSchema.partial();

export const updatePlaylistItem = asyncHandler(async (req, res) => {
  const data = updateItemSchema.parse(req.body);
  const item = await prisma.playlistItem.update({ where: { id: req.params.itemId }, data });
  res.json(item);
});

// Reordena todos los items de una vez: recibe [{ itemId, sortOrder }, ...]
const reorderSchema = z.array(z.object({ itemId: z.string().uuid(), sortOrder: z.number().int().min(0) }));

export const reorderPlaylistItems = asyncHandler(async (req, res) => {
  const items = reorderSchema.parse(req.body);
  await prisma.$transaction(
    items.map(({ itemId, sortOrder }) =>
      // offset temporal para evitar choques con la constraint UNIQUE(playlistId, sortOrder)
      prisma.playlistItem.update({ where: { id: itemId }, data: { sortOrder: sortOrder + 100000 } }),
    ),
  );
  await prisma.$transaction(
    items.map(({ itemId, sortOrder }) => prisma.playlistItem.update({ where: { id: itemId }, data: { sortOrder } })),
  );
  res.status(204).send();
});
