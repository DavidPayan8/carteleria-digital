import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { recordAuditLog } from "../../utils/audit";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug: solo minúsculas, números y guiones"),
});

const updateSchema = createSchema.partial();

export const listOrganizations = asyncHandler(async (_req, res) => {
  const organizations = await prisma.organization.findMany({ orderBy: { name: "asc" } });
  res.json(organizations);
});

export const getOrganization = asyncHandler(async (req, res) => {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(organization);
});

export const createOrganization = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const organization = await prisma.organization.create({ data });
  res.status(201).json(organization);
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const organization = await prisma.organization.update({ where: { id: req.params.id }, data });
  res.json(organization);
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUniqueOrThrow({ where: { id } });
    await recordAuditLog(tx, {
      entityName: "Organization",
      entityId: id,
      organizationId: id,
      performedByUserId: req.user?.userId,
      data: organization,
    });
    await tx.organization.delete({ where: { id } });
  });
  res.status(204).send();
});
