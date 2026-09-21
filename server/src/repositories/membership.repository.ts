import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const membershipRepository = {
  find(userId: string, tenantId: string) {
    return prisma.membership.findUnique({ where: { userId_tenantId: { userId, tenantId } } });
  },

  findByUser(userId: string) {
    return prisma.membership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { tenant: { name: "asc" } },
    });
  },

  upsert(userId: string, tenantId: string, role: Role) {
    return prisma.membership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: { userId, tenantId, role },
      update: { role },
    });
  },
};
