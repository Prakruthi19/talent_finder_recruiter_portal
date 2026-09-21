import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PageParams, toSkip } from "./pagination";

export interface AuditEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
}

export const auditRepository = {
  create(entry: AuditEntry) {
    return prisma.auditLog.create({ data: entry });
  },

  async findMany(tenantId: string, { page, pageSize }: PageParams) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: toSkip({ page, pageSize }),
        take: pageSize,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  },
};
