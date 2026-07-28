import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Guarda un snapshot del registro antes de un DELETE físico.
 * Debe llamarse dentro de la misma transacción que el delete.
 */
export async function recordAuditLog(
  db: Db,
  params: {
    entityName: string;
    entityId: string;
    organizationId?: string | null;
    performedByUserId?: string | null;
    data: unknown;
  },
) {
  await db.auditLog.create({
    data: {
      entityName: params.entityName,
      entityId: params.entityId,
      organizationId: params.organizationId ?? null,
      performedByUserId: params.performedByUserId ?? null,
      // replacer: los campos BigInt (ej. Media.sizeBytes) no son serializables por defecto
      dataSnapshot: JSON.stringify(params.data, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    },
  });
}
