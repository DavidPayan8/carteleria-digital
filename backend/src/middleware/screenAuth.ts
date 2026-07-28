import crypto from "node:crypto";
import { RequestHandler } from "express";
import { prisma } from "../config/prisma";
import { verifyScreenToken } from "../utils/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      screenId?: string;
    }
  }
}

export const requireScreenAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing screen token" });
    return;
  }

  const token = header.slice(7);
  try {
    const { screenId } = verifyScreenToken(token);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Comparar contra la BD permite revocar el token regenerando el pairing code.
    const screen = await prisma.screen.findUnique({ where: { id: screenId }, select: { authTokenHash: true } });
    if (!screen || screen.authTokenHash !== tokenHash) {
      res.status(401).json({ error: "Token revocado" });
      return;
    }

    req.screenId = screenId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid screen token" });
  }
};
