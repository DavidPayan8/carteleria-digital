import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAuditLog } from "../../utils/audit";

const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "formato esperado HH:mm o HH:mm:ss")
  .transform((v) => new Date(`1970-01-01T${v.length === 5 ? `${v}:00` : v}.000Z`));

const baseSchema = z.object({
  playlistId: z.string().uuid(),
  screenId: z.string().uuid().optional(),
  screenGroupId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
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
}) {
  const targets = [data.screenId, data.screenGroupId, data.locationId].filter(Boolean);
  if (targets.length !== 1) {
    const err = new Error("Debe indicarse exactamente uno de: screenId, screenGroupId, locationId");
    (err as { status?: number }).status = 400;
    throw err;
  }
}

export const listSchedules = asyncHandler(async (req, res) => {
  const { screenId, screenGroupId, locationId } = req.query as Record<string, string | undefined>;
  const schedules = await prisma.schedule.findMany({
    where: {
      ...(screenId ? { screenId } : {}),
      ...(screenGroupId ? { screenGroupId } : {}),
      ...(locationId ? { locationId } : {}),
    },
    orderBy: { priority: "desc" },
  });
  res.json(schedules);
});

export const createSchedule = asyncHandler(async (req, res) => {
  const data = baseSchema.parse(req.body);
  assertSingleTarget(data);
  const schedule = await prisma.schedule.create({ data });
  res.status(201).json(schedule);
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const data = baseSchema.partial().parse(req.body);
  if (data.screenId !== undefined || data.screenGroupId !== undefined || data.locationId !== undefined) {
    const current = await prisma.schedule.findUniqueOrThrow({ where: { id: req.params.id } });
    assertSingleTarget({ ...current, ...data });
  }
  const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data });
  res.json(schedule);
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const schedule = await tx.schedule.findUniqueOrThrow({ where: { id }, include: { playlist: true } });
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
