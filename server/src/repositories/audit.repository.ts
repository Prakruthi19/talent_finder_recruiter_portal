import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { runWithTenant } from "../lib/tenantScope";
import { PageParams, toSkip } from "./pagination";

export interface AuditEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
}

export const auditRepository = {
  // Runs after the response has been sent, outside the request's async context, so
  // the tenant is stated explicitly. createMany (a plain INSERT, no RETURNING) because
  // a row with no tenant may be written but is never readable back, and RETURNING
  // would count as a read.
  create(entry: AuditEntry) {
    return runWithTenant(entry.tenantId ?? null, () => prisma.auditLog.createMany({ data: [entry] }));
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
