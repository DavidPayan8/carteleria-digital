import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { organizationId, entityName } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 25);

  const where = {
    ...(organizationId ? { organizationId } : {}),
    ...(entityName ? { entityName } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { performedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { performedBy: { select: { id: true, email: true, fullName: true } } },
    }),
  ]);

  res.json({
    total,
    page,
    pageSize,
    items: logs.map((l) => ({ ...l, id: l.id.toString() })),
  });
});
