import { RequestHandler } from "express";
import { UserTokenPayload, verifyUserToken } from "../utils/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  try {
    req.user = verifyUserToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// roleIds: usar las constantes de ../config/roles (ROLE.SuperAdmin, etc.)
export const requireRole =
  (...roleIds: number[]): RequestHandler =>
  (req, res, next) => {
    const roles = req.user?.roles ?? [];
    const ok = roles.some((r) => roleIds.includes(r.roleId));
    if (!ok) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
