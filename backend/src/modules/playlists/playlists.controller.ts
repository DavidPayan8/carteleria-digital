import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { withSasUrl } from "../media/media.controller.js";
import { assertOrganizationAccess, ForbiddenError, getScope, Scope, scopedOrganizationId } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";

// Una playlist con locationId = NULL es una plantilla de toda la organización: cualquier
// usuario con acceso a la org puede LEERLA, pero solo OrgAdmin+ (locationIds === null) puede
// editarla. Un LocationAdmin solo gestiona playlists de su(s) propia(s) location(s).
function assertPlaylistReadAccess(scope: Scope, playlist: { organizationId: string; locationId: string | null }) {
  assertOrganizationAccess(scope, playlist.organizationId);
  if (scope.locationIds && playlist.locationId && !scope.locationIds.includes(playlist.locationId)) {
    throw new ForbiddenError();
  }
}

function assertPlaylistWriteAccess(scope: Scope, playlist: { organizationId: string; locationId: string | null }) {
  assertOrganizationAccess(scope, playlist.organizationId);
  if (scope.locationIds && (!playlist.locationId || !scope.locationIds.includes(playlist.locationId))) {
    throw new ForbiddenError();
  }
}

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
  const scope = getScope(req);
  const { organizationId: reqOrgId, locationId } = req.query as { organizationId?: string; locationId?: string };
  const organizationId = scopedOrganizationId(scope, reqOrgId);
  const playlists = await prisma.playlist.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(scope.locationIds ? { OR: [{ locationId: { in: scope.locationIds } }, { locationId: null }] } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(playlists);
});

export const getPlaylist = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const playlist = await prisma.playlist.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
  });
  assertPlaylistReadAccess(scope, playlist);
  const items = await Promise.all(
    playlist.items.map(async (item) => ({ ...item, media: await withSasUrl(item.media) })),
  );
  res.json({ ...playlist, items });
});

export const createPlaylist = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = createSchema.parse(req.body);
  assertPlaylistWriteAccess(scope, { organizationId: data.organizationId, locationId: data.locationId ?? null });
  const playlist = await prisma.playlist.create({ data });
  res.status(201).json(playlist);
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.playlist.findUniqueOrThrow({ where: { id: req.params.id } });
  assertPlaylistWriteAccess(scope, existing);
  const data = updateSchema.parse(req.body);
  const playlist = await prisma.playlist.update({ where: { id: req.params.id }, data });
  res.json(playlist);
});

export const duplicatePlaylist = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const original = await prisma.playlist.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  // La copia cae en la misma organización/location que el original, así que basta con
  // comprobar acceso de escritura ahí (ya implica que se puede leer el original).
  assertPlaylistWriteAccess(scope, original);

  const duplicated = await prisma.playlist.create({
    data: {
      organizationId: original.organizationId,
      locationId: original.locationId,
      name: `${original.name} (copia)`,
      defaultItemDurationSeconds: original.defaultItemDurationSeconds,
      items: {
        create: original.items.map((item) => ({
          mediaId: item.mediaId,
          sortOrder: item.sortOrder,
          durationSecondsOverride: item.durationSecondsOverride,
          transitionType: item.transitionType,
        })),
      },
    },
  });

  res.status(201).json(duplicated);
});

export const deletePlaylist = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const playlist = await tx.playlist.findUniqueOrThrow({ where: { id } });
    assertPlaylistWriteAccess(scope, playlist);
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
  const scope = getScope(req);
  const playlist = await prisma.playlist.findUniqueOrThrow({ where: { id: req.params.id } });
  assertPlaylistWriteAccess(scope, playlist);
  const data = addItemSchema.parse(req.body);
  const item = await prisma.playlistItem.create({
    data: { ...data, playlistId: req.params.id },
  });
  res.status(201).json(item);
});

export const removePlaylistItem = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.playlistItem.findUniqueOrThrow({
    where: { id: req.params.itemId },
    include: { playlist: true },
  });
  assertPlaylistWriteAccess(scope, existing.playlist);
  await prisma.playlistItem.delete({ where: { id: req.params.itemId } });
  res.status(204).send();
});

const updateItemSchema = addItemSchema.partial();

export const updatePlaylistItem = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.playlistItem.findUniqueOrThrow({
    where: { id: req.params.itemId },
    include: { playlist: true },
  });
  assertPlaylistWriteAccess(scope, existing.playlist);
  const data = updateItemSchema.parse(req.body);
  const item = await prisma.playlistItem.update({ where: { id: req.params.itemId }, data });
  res.json(item);
});

// Reordena todos los items de una vez: recibe [{ itemId, sortOrder }, ...]
const reorderSchema = z.array(z.object({ itemId: z.string().uuid(), sortOrder: z.number().int().min(0) }));

export const reorderPlaylistItems = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const playlist = await prisma.playlist.findUniqueOrThrow({ where: { id: req.params.id } });
  assertPlaylistWriteAccess(scope, playlist);
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
