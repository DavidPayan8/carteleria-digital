import { Request } from "express";
import { ROLE } from "../config/roles.js";

// GUID que nunca existe en la BD: fuerza un where-clause a no matchear nada
// en vez de dejar `organizationId: undefined` (que Prisma interpreta como "sin filtro").
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "No tienes acceso a este recurso") {
    super(message);
  }
}

export interface Scope {
  isSuperAdmin: boolean;
  // null solo para SuperAdmin (sin restricción de organización).
  organizationId: string | null;
  // null = toda la organización (rol OrgAdmin, o rol sin locationId); array = restringido a estas locations (LocationAdmin/Viewer con location concreta).
  locationIds: string[] | null;
}

// Deriva el alcance de datos del usuario autenticado a partir de su JWT
// (organizationId + roles con locationId opcional). SuperAdmin no tiene restricción.
export function getScope(req: Request): Scope {
  const user = req.user!;
  const isSuperAdmin = user.roles.some((r) => r.roleId === ROLE.SuperAdmin);
  if (isSuperAdmin) {
    return { isSuperAdmin: true, organizationId: null, locationIds: null };
  }

  const orgWide = user.roles.some((r) => r.locationId === null);
  const locationIds = orgWide
    ? null
    : [...new Set(user.roles.map((r) => r.locationId).filter((id): id is string => !!id))];

  return { isSuperAdmin: false, organizationId: user.organizationId, locationIds };
}

// Para filtrar listados: fuerza el organizationId del usuario si no es SuperAdmin,
// ignorando lo que el cliente pida por query string.
export function scopedOrganizationId(scope: Scope, requested?: string): string | undefined {
  if (scope.isSuperAdmin) return requested;
  return scope.organizationId ?? NO_MATCH_ID;
}

// Para filtrar listados de recursos ligados a una Location: además del organizationId,
// si el usuario está restringido a locations concretas (LocationAdmin), añade `id IN (...)`.
export function locationScopeWhere(scope: Scope): Record<string, unknown> {
  if (scope.isSuperAdmin) return {};
  const where: Record<string, unknown> = { organizationId: scope.organizationId ?? NO_MATCH_ID };
  if (scope.locationIds) where.id = { in: scope.locationIds };
  return where;
}

export function assertOrganizationAccess(scope: Scope, organizationId: string | null | undefined): void {
  if (scope.isSuperAdmin) return;
  if (!organizationId || organizationId !== scope.organizationId) {
    throw new ForbiddenError();
  }
}

export function assertLocationAccess(scope: Scope, location: { id: string; organizationId: string }): void {
  if (scope.isSuperAdmin) return;
  if (location.organizationId !== scope.organizationId) throw new ForbiddenError();
  if (scope.locationIds && !scope.locationIds.includes(location.id)) throw new ForbiddenError();
}
