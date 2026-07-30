import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { signUserToken } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email }, include: { roles: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signUserToken({
    userId: user.id,
    organizationId: user.organizationId,
    roles: user.roles.map((r) => ({ roleId: r.roleId, locationId: r.locationId })),
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, organizationId: user.organizationId },
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// Autoservicio: cualquier usuario autenticado cambia su propia contraseña, sin necesitar
// permisos de gestión de usuarios. Exige la contraseña actual (a diferencia del reset que
// puede hacer un SuperAdmin/OrgAdmin vía PATCH /api/users/:id sin conocerla).
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const userId = req.user!.userId;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "La contraseña actual no es correcta" });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  res.status(204).send();
});
