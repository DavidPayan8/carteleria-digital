import { Request } from "express";
import { z } from "zod";
import { ROLE } from "../../config/roles.js";
import { prisma } from "../../config/prisma.js";
import { ForbiddenError } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";
import { hashPassword } from "../../utils/password.js";

interface ManagePermission {
  asSuperAdmin: boolean;
  // organizationId del propio OrgAdmin (null solo cuando asSuperAdmin === true).
  organizationId: string | null;
}

// Quién puede gestionar usuarios: SuperAdmin (sin restricción) u OrgAdmin (solo su propia
// organización). LocationAdmin y Viewer no pueden crear/listar/borrar usuarios.
function getManagePermission(req: Request): ManagePermission {
  const roles = req.user!.roles;
  if (roles.some((r) => r.roleId === ROLE.SuperAdmin)) {
    return { asSuperAdmin: true, organizationId: null };
  }
  if (roles.some((r) => r.roleId === ROLE.OrgAdmin)) {
    return { asSuperAdmin: false, organizationId: req.user!.organizationId };
  }
  throw new ForbiddenError("No tienes permiso para gestionar usuarios");
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  // Omitido únicamente cuando roleId === SuperAdmin (acceso global, sin organización).
  organizationId: z.string().uuid().optional(),
  roleId: z.number().int().min(1).max(4), // 1=SuperAdmin, 2=OrgAdmin, 3=LocationAdmin, 4=Viewer
  locationId: z.string().uuid().optional(), // obligatorio si roleId === LocationAdmin
});

export const listUsers = asyncHandler(async (req, res) => {
  const perm = getManagePermission(req);
  const users = await prisma.user.findMany({
    where: perm.asSuperAdmin ? undefined : { organizationId: perm.organizationId },
    include: { roles: true },
    orderBy: { email: "asc" },
  });
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      organizationId: u.organizationId,
      roles: u.roles.map((r) => ({ roleId: r.roleId, locationId: r.locationId })),
      createdAt: u.createdAt,
    })),
  );
});

export const createUser = asyncHandler(async (req, res) => {
  const perm = getManagePermission(req);
  const data = createUserSchema.parse(req.body);

  let organizationId: string | null;
  if (data.roleId === ROLE.SuperAdmin) {
    if (!perm.asSuperAdmin) throw new ForbiddenError("Solo un SuperAdmin puede crear otro SuperAdmin");
    organizationId = null;
  } else {
    if (!data.organizationId) throw new ForbiddenError("Falta organizationId");
    if (!perm.asSuperAdmin && data.organizationId !== perm.organizationId) {
      throw new ForbiddenError("Solo puedes crear usuarios de tu propia organización");
    }
    organizationId = data.organizationId;
  }

  if (data.roleId === ROLE.LocationAdmin) {
    if (!data.locationId) throw new ForbiddenError("locationId es obligatorio para el rol LocationAdmin");
    const location = await prisma.location.findUniqueOrThrow({ where: { id: data.locationId } });
    if (location.organizationId !== organizationId) {
      throw new ForbiddenError("Esa location no pertenece a la organización indicada");
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    res.status(409).json({ error: "Ya existe un usuario con ese email" });
    return;
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      organizationId,
      roles: {
        create: { roleId: data.roleId, locationId: data.roleId === ROLE.LocationAdmin ? data.locationId : null },
      },
    },
    include: { roles: true },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    organizationId: user.organizationId,
    roles: user.roles.map((r) => ({ roleId: r.roleId, locationId: r.locationId })),
    createdAt: user.createdAt,
  });
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  roleId: z.number().int().min(1).max(4).optional(),
  locationId: z.string().uuid().optional(), // obligatorio si roleId === LocationAdmin
});

export const updateUser = asyncHandler(async (req, res) => {
  const perm = getManagePermission(req);
  const { id } = req.params;
  const data = updateUserSchema.parse(req.body);

  const target = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (!perm.asSuperAdmin && target.organizationId !== perm.organizationId) {
    throw new ForbiddenError("Solo puedes editar usuarios de tu propia organización");
  }
  if (data.roleId === ROLE.SuperAdmin && !perm.asSuperAdmin) {
    throw new ForbiddenError("Solo un SuperAdmin puede asignar el rol SuperAdmin");
  }
  if (data.roleId === ROLE.LocationAdmin) {
    if (!data.locationId) throw new ForbiddenError("locationId es obligatorio para el rol LocationAdmin");
    const location = await prisma.location.findUniqueOrThrow({ where: { id: data.locationId } });
    if (location.organizationId !== target.organizationId) {
      throw new ForbiddenError("Esa location no pertenece a la organización del usuario");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const patch: { fullName?: string; passwordHash?: string } = {};
    if (data.fullName !== undefined) patch.fullName = data.fullName;
    if (data.password !== undefined) patch.passwordHash = await hashPassword(data.password);
    if (Object.keys(patch).length > 0) {
      await tx.user.update({ where: { id }, data: patch });
    }
    if (data.roleId !== undefined) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({
        data: { userId: id, roleId: data.roleId, locationId: data.roleId === ROLE.LocationAdmin ? data.locationId : null },
      });
    }
    return tx.user.findUniqueOrThrow({ where: { id }, include: { roles: true } });
  });

  res.json({
    id: updated.id,
    email: updated.email,
    fullName: updated.fullName,
    organizationId: updated.organizationId,
    roles: updated.roles.map((r) => ({ roleId: r.roleId, locationId: r.locationId })),
    createdAt: updated.createdAt,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const perm = getManagePermission(req);
  const { id } = req.params;

  if (id === req.user!.userId) {
    throw new ForbiddenError("No puedes borrar tu propio usuario");
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUniqueOrThrow({ where: { id } });
    if (!perm.asSuperAdmin && target.organizationId !== perm.organizationId) {
      throw new ForbiddenError("Solo puedes borrar usuarios de tu propia organización");
    }
    // Nunca volcamos passwordHash al audit log.
    await recordAuditLog(tx, {
      entityName: "User",
      entityId: id,
      organizationId: target.organizationId,
      performedByUserId: req.user?.userId,
      data: { email: target.email, fullName: target.fullName, organizationId: target.organizationId },
    });
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  res.status(204).send();
});
