import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { assertLocationAccess, assertOrganizationAccess, getScope, locationScopeWhere } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  timeZone: z.string().min(1).default("Europe/Madrid"),
});

const updateSchema = createSchema.partial().omit({ organizationId: true });

export const listLocations = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const requestedOrgId = req.query.organizationId as string | undefined;
  const where = scope.isSuperAdmin
    ? requestedOrgId
      ? { organizationId: requestedOrgId }
      : undefined
    : locationScopeWhere(scope);
  const locations = await prisma.location.findMany({ where, orderBy: { name: "asc" } });
  res.json(locations);
});

export const getLocation = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const location = await prisma.location.findUniqueOrThrow({ where: { id: req.params.id } });
  assertLocationAccess(scope, location);
  res.json(location);
});

export const createLocation = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = createSchema.parse(req.body);
  assertOrganizationAccess(scope, data.organizationId);
  const location = await prisma.location.create({ data });
  res.status(201).json(location);
});

export const updateLocation = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.location.findUniqueOrThrow({ where: { id: req.params.id } });
  assertLocationAccess(scope, existing);
  const data = updateSchema.parse(req.body);
  const location = await prisma.location.update({ where: { id: req.params.id }, data });
  res.json(location);
});

export const deleteLocation = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const location = await tx.location.findUniqueOrThrow({ where: { id } });
    assertLocationAccess(scope, location);
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
