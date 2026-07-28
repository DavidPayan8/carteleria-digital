import { z } from "zod";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { signUserToken } from "../../utils/jwt";
import { verifyPassword } from "../../utils/password";

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
