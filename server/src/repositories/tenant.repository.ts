import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PageParams, PageResult, toSkip } from "./pagination";

export interface TenantListParams extends PageParams {
  search?: string;
}

// Every listing is scoped to the caller's memberships: there is deliberately no
// "all tenants" query for request handling, only `findAll` for server bootstrap.
const ofUser = (userId: string): Prisma.TenantWhereInput => ({ memberships: { some: { userId } } });

export const tenantRepository = {
  async findManyForUser(
    userId: string,
    { search, page, pageSize }: TenantListParams
  ): Promise<PageResult<Prisma.TenantGetPayload<{}>>> {
    const where: Prisma.TenantWhereInput = {
      ...ofUser(userId),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { name: "asc" },
        skip: toSkip({ page, pageSize }),
        take: pageSize,
      }),
      prisma.tenant.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  findById(id: string) {
    return prisma.tenant.findUnique({ where: { id } });
  },

  findByName(name: string) {
    return prisma.tenant.findUnique({ where: { name } });
  },

  /** Server bootstrap only, never for serving a request. */
  findAll() {
    return prisma.tenant.findMany({ select: { id: true } });
  },

  /** Creates the tenant and makes its creator an ADMIN in one atomic write. */
  createWithAdmin(userId: string, name: string) {
    return prisma.tenant.create({ data: { name, memberships: { create: { userId, role: "ADMIN" } } } });
  },

  countForUser(userId: string) {
    return prisma.tenant.count({ where: ofUser(userId) });
  },

  countActiveForUser(userId: string) {
    return prisma.tenant.count({ where: { ...ofUser(userId), status: "ACTIVE" } });
  },
};
