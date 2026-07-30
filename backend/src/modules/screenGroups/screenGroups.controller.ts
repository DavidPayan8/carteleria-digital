import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { assertLocationAccess, getScope, locationScopeWhere } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";

const createSchema = z.object({
  locationId: z.string().uuid(),
  name: z.string().min(1),
});

const updateSchema = z.object({ name: z.string().min(1) });

export const listScreenGroups = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const locationId = req.query.locationId as string | undefined;
  const where = scope.isSuperAdmin
    ? locationId
      ? { locationId }
      : undefined
    : { ...(locationId ? { locationId } : {}), location: locationScopeWhere(scope) };
  const groups = await prisma.screenGroup.findMany({ where, orderBy: { name: "asc" } });
  res.json(groups);
});

export const createScreenGroup = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = createSchema.parse(req.body);
  const location = await prisma.location.findUniqueOrThrow({ where: { id: data.locationId } });
  assertLocationAccess(scope, location);
  const group = await prisma.screenGroup.create({ data });
  res.status(201).json(group);
});

export const updateScreenGroup = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.screenGroup.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { location: true },
  });
  assertLocationAccess(scope, existing.location);
  const data = updateSchema.parse(req.body);
  const group = await prisma.screenGroup.update({ where: { id: req.params.id }, data });
  res.json(group);
});

// Borrar un grupo desagrupa sus pantallas (quedan sin screenGroupId) en vez de
// bloquear el borrado; las Schedules que apuntaban directamente al grupo sí se
// eliminan, igual que al borrar una ScreenZone o una Playlist.
export const deleteScreenGroup = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const group = await tx.screenGroup.findUniqueOrThrow({ where: { id }, include: { location: true } });
    assertLocationAccess(scope, group.location);
    await recordAuditLog(tx, {
      entityName: "ScreenGroup",
      entityId: id,
      organizationId: group.location.organizationId,
      performedByUserId: req.user?.userId,
      data: group,
    });
    await tx.schedule.deleteMany({ where: { screenGroupId: id } });
    await tx.screen.updateMany({ where: { screenGroupId: id }, data: { screenGroupId: null } });
    await tx.screenGroup.delete({ where: { id } });
  });
  res.status(204).send();
});
