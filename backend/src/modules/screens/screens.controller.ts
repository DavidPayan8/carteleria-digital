import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { assertLocationAccess, getScope, locationScopeWhere } from "../../middleware/scope.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { recordAuditLog } from "../../utils/audit.js";
import { signScreenToken } from "../../utils/jwt.js";

const createSchema = z.object({
  locationId: z.string().uuid(),
  screenGroupId: z.string().uuid().optional(),
  name: z.string().min(1),
  orientation: z.number().int().min(0).max(1).optional(),
  resolutionWidth: z.number().int().positive().optional(),
  resolutionHeight: z.number().int().positive().optional(),
  pollingIntervalSeconds: z.number().int().min(5).max(300).optional(),
});

const updateSchema = createSchema.partial().omit({ locationId: true }).extend({
  // A diferencia de create, update debe poder desasignar el grupo explícitamente.
  screenGroupId: z.string().uuid().nullable().optional(),
});

async function assertGroupBelongsToLocation(screenGroupId: string | undefined, locationId: string): Promise<void> {
  if (!screenGroupId) return;
  const group = await prisma.screenGroup.findUniqueOrThrow({ where: { id: screenGroupId } });
  if (group.locationId !== locationId) {
    const err = new Error("El grupo de pantallas no pertenece a este restaurante");
    (err as { status?: number }).status = 400;
    throw err;
  }
}

const PAIRING_CODE_TTL_MINUTES = 10;

function generatePairingCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export const listScreens = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const locationId = req.query.locationId as string | undefined;
  const where = scope.isSuperAdmin
    ? locationId
      ? { locationId }
      : undefined
    : { ...(locationId ? { locationId } : {}), location: locationScopeWhere(scope) };
  const screens = await prisma.screen.findMany({ where, orderBy: { name: "asc" } });
  res.json(screens.map(({ authTokenHash: _authTokenHash, ...s }) => s));
});

export const getScreen = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { authTokenHash: _authTokenHash, location, ...screen } = await prisma.screen.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { location: true },
  });
  assertLocationAccess(scope, location);
  res.json(screen);
});

export const createScreen = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const data = createSchema.parse(req.body);
  const location = await prisma.location.findUniqueOrThrow({ where: { id: data.locationId } });
  assertLocationAccess(scope, location);
  await assertGroupBelongsToLocation(data.screenGroupId, data.locationId);
  const screen = await prisma.screen.create({
    data: {
      ...data,
      pairingCode: generatePairingCode(),
      pairingCodeExpiresAt: new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60 * 1000),
    },
  });
  res.status(201).json(screen);
});

export const updateScreen = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.screen.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { location: true },
  });
  assertLocationAccess(scope, existing.location);
  const data = updateSchema.parse(req.body);
  if (data.screenGroupId) await assertGroupBelongsToLocation(data.screenGroupId, existing.locationId);
  const { authTokenHash: _authTokenHash, ...screen } = await prisma.screen.update({
    where: { id: req.params.id },
    data,
  });
  res.json(screen);
});

// Regenera un código de emparejamiento (ej. la pantalla se desvinculó o perdió el token).
export const regeneratePairingCode = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.screen.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { location: true },
  });
  assertLocationAccess(scope, existing.location);
  const screen = await prisma.screen.update({
    where: { id: req.params.id },
    data: {
      pairingCode: generatePairingCode(),
      pairingCodeExpiresAt: new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60 * 1000),
      authTokenHash: null,
      pairedAt: null,
    },
  });
  res.json({ pairingCode: screen.pairingCode, expiresAt: screen.pairingCodeExpiresAt });
});

// Desempareja la pantalla (revoca el token) sin generar un código nuevo todavía.
export const unpairScreen = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const existing = await prisma.screen.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { location: true },
  });
  assertLocationAccess(scope, existing.location);
  const screen = await prisma.screen.update({
    where: { id: req.params.id },
    data: {
      authTokenHash: null,
      pairedAt: null,
      pairingCode: null,
      pairingCodeExpiresAt: null,
    },
  });
  res.json({ id: screen.id });
});

export const deleteScreen = asyncHandler(async (req, res) => {
  const scope = getScope(req);
  const { id } = req.params;
  await prisma.$transaction(async (tx) => {
    const screen = await tx.screen.findUniqueOrThrow({ where: { id } });
    const location = await tx.location.findUniqueOrThrow({ where: { id: screen.locationId } });
    assertLocationAccess(scope, location);
    await recordAuditLog(tx, {
      entityName: "Screen",
      entityId: id,
      organizationId: location.organizationId,
      performedByUserId: req.user?.userId,
      data: screen,
    });
    await tx.schedule.deleteMany({ where: { screenId: id } });
    await tx.screenHeartbeat.deleteMany({ where: { screenId: id } });
    await tx.screen.delete({ where: { id } });
  });
  res.status(204).send();
});

// Endpoint público (sin auth de usuario): el dispositivo/player introduce el
// código mostrado en pantalla y a cambio recibe un token de larga duración.
const pairSchema = z.object({ pairingCode: z.string().length(6) });

export const pairScreen = asyncHandler(async (req, res) => {
  const { pairingCode } = pairSchema.parse(req.body);

  const screen = await prisma.screen.findUnique({ where: { pairingCode } });
  if (!screen || !screen.pairingCodeExpiresAt || screen.pairingCodeExpiresAt < new Date()) {
    res.status(404).json({ error: "Código inválido o expirado" });
    return;
  }

  const token = signScreenToken({ screenId: screen.id });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.screen.update({
    where: { id: screen.id },
    data: {
      authTokenHash: tokenHash,
      pairedAt: new Date(),
      pairingCode: null,
      pairingCodeExpiresAt: null,
    },
  });

  res.json({ screenId: screen.id, token, pollingIntervalSeconds: screen.pollingIntervalSeconds });
});
