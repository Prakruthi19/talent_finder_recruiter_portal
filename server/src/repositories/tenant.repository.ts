import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PageParams, PageResult, toSkip } from "./pagination";

export interface TenantListParams extends PageParams {
  search?: string;
}

export const tenantRepository = {
  async findMany({ search, page, pageSize }: TenantListParams): Promise<PageResult<Prisma.TenantGetPayload<{}>>> {
    const where: Prisma.TenantWhereInput = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};

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

  create(data: { name: string }) {
    return prisma.tenant.create({ data });
  },
};
