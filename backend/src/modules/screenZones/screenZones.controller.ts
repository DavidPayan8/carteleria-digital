import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { assertLocationAccess, getScope, locationScopeWhere } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";

// Coordenadas en porcentaje (0-100) relativas a la propia pantalla.
const zoneFields = {
  name: z.string().min(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
  zIndex: z.number().int().optional(),
};

const createSchema = z.object({
  screenId: z.string().uuid(),
  ...zoneFields,
});

const updateSchema = z.object(zoneFields).partial();

export const listScreenZones = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const screenId = req.query.screenId as string | undefined;
  const where = scope.isSuperAdmin
    ? screenId
      ? { screenId }
      : undefined
    : { ...(screenId ? { screenId } : {}), screen: { location: locationScopeWhere(scope) } };
  const zones = await prisma.screenZone.findMany({ where, orderBy: { zIndex: "asc" } });
  res.json(zones);
});

export const createScreenZone = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = createSchema.parse(req.body);
  const screen = await prisma.screen.findUniqueOrThrow({
    where: { id: data.screenId },
    include: { location: true },
  });
  assertLocationAccess(scope, screen.location);
  const zone = await prisma.screenZone.create({ data });
  res.status(201).json(zone);
});

export const updateScreenZone = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.screenZone.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { screen: { include: { location: true } } },
  });
  assertLocationAccess(scope, existing.screen.location);
  const data = updateSchema.parse(req.body);
  const zone = await prisma.screenZone.update({ where: { id: req.params.id }, data });
  res.json(zone);
});

export const deleteScreenZone = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const zone = await tx.screenZone.findUniqueOrThrow({ where: { id } });
    const screen = await tx.screen.findUniqueOrThrow({ where: { id: zone.screenId } });
    const location = await tx.location.findUniqueOrThrow({ where: { id: screen.locationId } });
    assertLocationAccess(scope, location);
    await recordAuditLog(tx, {
      entityName: "ScreenZone",
      entityId: id,
      organizationId: location.organizationId,
      performedByUserId: req.user?.userId,
      data: zone,
    });
    // Las Schedules que apuntaban a esta zona dejan de tener sentido sin ella.
    await tx.schedule.deleteMany({ where: { screenZoneId: id } });
    await tx.screenZone.delete({ where: { id } });
  });
  res.status(204).send();
});
