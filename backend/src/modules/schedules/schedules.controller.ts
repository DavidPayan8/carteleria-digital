import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { assertLocationAccess, assertOrganizationAccess, getScope, locationScopeWhere, Scope } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";

type Db = PrismaClient | Prisma.TransactionClient;

// Resuelve a qué Location pertenece (en última instancia) el destino de una Schedule,
// que apunta a exactamente uno de screenId/screenGroupId/locationId/screenZoneId.
async function resolveTargetLocation(
  db: Db,
  target: {
    screenId?: string | null;
    screenGroupId?: string | null;
    locationId?: string | null;
    screenZoneId?: string | null;
  },
): Promise<{ id: string; organizationId: string }> {
  if (target.locationId) {
    return db.location.findUniqueOrThrow({ where: { id: target.locationId } });
  }
  if (target.screenId) {
    const screen = await db.screen.findUniqueOrThrow({
      where: { id: target.screenId },
      include: { location: true },
    });
    return screen.location;
  }
  if (target.screenGroupId) {
    const group = await db.screenGroup.findUniqueOrThrow({
      where: { id: target.screenGroupId },
      include: { location: true },
    });
    return group.location;
  }
  if (target.screenZoneId) {
    const zone = await db.screenZone.findUniqueOrThrow({
      where: { id: target.screenZoneId },
      include: { screen: { include: { location: true } } },
    });
    return zone.screen.location;
  }
  throw new Error("Falta el destino de la programación");
}

function scheduleScopeWhere(scope: Scope): Record<string, unknown> {
  if (scope.isSuperAdmin) return {};
  const locationFilter = locationScopeWhere(scope);
  return {
    OR: [
      { location: locationFilter },
      { screen: { location: locationFilter } },
      { screenGroup: { location: locationFilter } },
      { screenZone: { screen: { location: locationFilter } } },
    ],
  };
}

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "formato esperado HH:mm o HH:mm:ss")
  .transform((v) => new Date(`1970-01-01T${v.length === 5 ? `${v}:00` : v}.000Z`));

const baseSchema = z.object({
  playlistId: z.string().uuid(),
  screenId: z.string().uuid().optional(),
  screenGroupId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  screenZoneId: z.string().uuid().optional(),
  name: z.string().min(1),
  priority: z.number().int().default(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  daysOfWeek: z.number().int().min(1).max(127).default(127),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
});

function assertSingleTarget(data: {
  screenId?: string | null;
  screenGroupId?: string | null;
  locationId?: string | null;
  screenZoneId?: string | null;
}) {
  const targets = [data.screenId, data.screenGroupId, data.locationId, data.screenZoneId].filter(Boolean);
  if (targets.length !== 1) {
    const err = new Error(
      "Debe indicarse exactamente uno de: screenId, screenGroupId, locationId, screenZoneId",
    );
    (err as { status?: number }).status = 400;
    throw err;
  }
}

export const listSchedules = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { screenId, screenGroupId, locationId, screenZoneId } = req.query as Record<
    string,
    string | undefined
  >;

  // locationId filtra "todas las Schedules de este restaurante": las que apuntan
  // directamente a la Location, y también las que apuntan a una de sus Screens,
  // ScreenGroups o ScreenZones (el campo Schedule.locationId es NULL en esos casos).
  const requestedWhere =
    screenId || screenGroupId || screenZoneId
      ? {
          ...(screenId ? { screenId } : {}),
          ...(screenGroupId ? { screenGroupId } : {}),
          ...(screenZoneId ? { screenZoneId } : {}),
        }
      : locationId
        ? {
            OR: [
              { locationId },
              { screen: { locationId } },
              { screenGroup: { locationId } },
              { screenZone: { screen: { locationId } } },
            ],
          }
        : {};

  const where = scope.isSuperAdmin ? requestedWhere : { AND: [requestedWhere, scheduleScopeWhere(scope)] };

  const schedules = await prisma.schedule.findMany({ where, orderBy: { priority: "desc" } });
  res.json(schedules);
});

export const createSchedule = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = baseSchema.parse(req.body);
  assertSingleTarget(data);
  const [location, playlist] = await Promise.all([
    resolveTargetLocation(prisma, data),
    prisma.playlist.findUniqueOrThrow({ where: { id: data.playlistId } }),
  ]);
  assertLocationAccess(scope, location);
  assertOrganizationAccess(scope, playlist.organizationId);
  const schedule = await prisma.schedule.create({ data });
  res.status(201).json(schedule);
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const current = await prisma.schedule.findUniqueOrThrow({ where: { id: req.params.id } });
  assertLocationAccess(scope, await resolveTargetLocation(prisma, current));

  const data = baseSchema.partial().parse(req.body);
  if (
    data.screenId !== undefined ||
    data.screenGroupId !== undefined ||
    data.locationId !== undefined ||
    data.screenZoneId !== undefined
  ) {
    const merged = { ...current, ...data };
    assertSingleTarget(merged);
    assertLocationAccess(scope, await resolveTargetLocation(prisma, merged));
  }
  if (data.playlistId) {
    const playlist = await prisma.playlist.findUniqueOrThrow({ where: { id: data.playlistId } });
    assertOrganizationAccess(scope, playlist.organizationId);
  }
  const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data });
  res.json(schedule);
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const schedule = await tx.schedule.findUniqueOrThrow({ where: { id }, include: { playlist: true } });
    assertLocationAccess(scope, await resolveTargetLocation(tx, schedule));
    await recordAuditLog(tx, {
      entityName: "Schedule",
      entityId: id,
      organizationId: schedule.playlist.organizationId,
      performedByUserId: req.user?.userId,
      data: schedule,
    });
    await tx.schedule.delete({ where: { id } });
  });
  res.status(204).send();
});
