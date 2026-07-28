import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAuditLog } from "../../utils/audit";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  timeZone: z.string().min(1).default("Europe/Madrid"),
});

const updateSchema = createSchema.partial().omit({ organizationId: true });

export const listLocations = asyncHandler(async (req, res) => {
  const organizationId = req.query.organizationId as string | undefined;
  const locations = await prisma.location.findMany({
    where: organizationId ? { organizationId } : undefined,
    orderBy: { name: "asc" },
  });
  res.json(locations);
});

export const getLocation = asyncHandler(async (req, res) => {
  const location = await prisma.location.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(location);
});

export const createLocation = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const location = await prisma.location.create({ data });
  res.status(201).json(location);
});

export const updateLocation = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const location = await prisma.location.update({ where: { id: req.params.id }, data });
  res.json(location);
});

export const deleteLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const location = await tx.location.findUniqueOrThrow({ where: { id } });
    await recordAuditLog(tx, {
      entityName: "Location",
      entityId: id,
      organizationId: location.organizationId,
      performedByUserId: req.user?.userId,
      data: location,
    });
    await tx.location.delete({ where: { id } });
  });
  res.status(204).send();
});
