import { Prisma, JobOrderStatus } from "@prisma/client";
import { prisma, scopedQueryRaw, tenantTransaction } from "../lib/prisma";
import { PageParams, PageResult, toSkip } from "./pagination";

export type JobOrderSortBy = "title" | "location" | "minExperience" | "createdAt";
export type SortDir = "asc" | "desc";

export interface JobOrderListParams extends PageParams {
  search?: string;
  sortBy?: JobOrderSortBy;
  sortDir?: SortDir;
}

const jobOrderWithSkills = {
  include: { requiredSkills: { include: { skill: true } } },
} satisfies Prisma.JobOrderDefaultArgs;

export type JobOrderWithSkills = Prisma.JobOrderGetPayload<typeof jobOrderWithSkills>;

export interface CreateJobOrderInput {
  tenantId: string;
  title: string;
  clientName?: string | null;
  location: string;
  minExperience: number;
  numberOfOpenings: number;
  skillIds: string[];
}

export interface UpdateJobOrderInput {
  title?: string;
  clientName?: string | null;
  location?: string;
  minExperience?: number;
  numberOfOpenings?: number;
  status?: JobOrderStatus;
  skillIds?: string[];
}

export const jobOrderRepository = {
  async findMany(
    tenantId: string,
    { search, page, pageSize, sortBy = "createdAt", sortDir = "desc" }: JobOrderListParams
  ): Promise<PageResult<JobOrderWithSkills>> {
    const where: Prisma.JobOrderWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { clientName: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.JobOrderOrderByWithRelationInput =
      sortBy === "title"
        ? { title: sortDir }
        : sortBy === "location"
        ? { location: sortDir }
        : sortBy === "minExperience"
        ? { minExperience: sortDir }
        : { createdAt: sortDir };

    const [items, total] = await Promise.all([
      prisma.jobOrder.findMany({
        where,
        orderBy,
        skip: toSkip({ page, pageSize }),
        take: pageSize,
        ...jobOrderWithSkills,
      }),
      prisma.jobOrder.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  findById(tenantId: string, id: string): Promise<JobOrderWithSkills | null> {
    return prisma.jobOrder.findFirst({ where: { id, tenantId }, ...jobOrderWithSkills });
  },

  create(data: CreateJobOrderInput): Promise<JobOrderWithSkills> {
    return prisma.jobOrder.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        clientName: data.clientName,
        location: data.location,
        minExperience: data.minExperience,
        numberOfOpenings: data.numberOfOpenings,
        requiredSkills: { create: data.skillIds.map((skillId) => ({ skillId })) },
      },
      ...jobOrderWithSkills,
    });
  },

  async update(id: string, data: UpdateJobOrderInput): Promise<JobOrderWithSkills> {
    // tenantTransaction, not prisma.$transaction: it carries the tenant context for row-level security.
    return tenantTransaction(async (tx) => {
      if (data.skillIds) {
        await tx.jobOrderRequiredSkill.deleteMany({ where: { jobOrderId: id } });
      }
      return tx.jobOrder.update({
        where: { id },
        data: {
          title: data.title,
          clientName: data.clientName,
          location: data.location,
          minExperience: data.minExperience,
          numberOfOpenings: data.numberOfOpenings,
          status: data.status,
          ...(data.skillIds
            ? { requiredSkills: { create: data.skillIds.map((skillId) => ({ skillId })) } }
            : {}),
        },
        ...jobOrderWithSkills,
      });
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.jobOrder.delete({ where: { id } });
  },

  /**
   * The matching algorithm itself, as a SQL join rather than an app-code
   * loop: join the job order's required skills to candidate skills on the
   * shared skillId, grouped per candidate. The inner joins mean a candidate
   * with zero overlapping skills never appears in the result set at all —
   * Postgres does the filtering and counting, not Node.
   */
  async findMatchCounts(
    tenantId: string,
    jobOrderId: string
  ): Promise<{ candidateId: string; matchCount: number; matchedSkillNames: string[] }[]> {
    return scopedQueryRaw<{ candidateId: string; matchCount: number; matchedSkillNames: string[] }[]>(Prisma.sql`
      SELECT
        cs."candidateId" AS "candidateId",
        COUNT(*)::int AS "matchCount",
        array_agg(s."name") AS "matchedSkillNames"
      FROM job_order_required_skills jors
      JOIN candidate_skills cs ON cs."skillId" = jors."skillId"
      JOIN candidates c ON c."id" = cs."candidateId"
      JOIN skills s ON s."id" = cs."skillId"
      WHERE jors."jobOrderId" = ${jobOrderId}::uuid
        AND c."tenantId" = ${tenantId}::uuid
      GROUP BY cs."candidateId"
      ORDER BY "matchCount" DESC
    `);
  },

  findCandidatesByIds(ids: string[]) {
    return prisma.candidate.findMany({
      where: { id: { in: ids } },
      include: { skills: { include: { skill: true } } },
    });
  },

  count(tenantId: string) {
    return prisma.jobOrder.count({ where: { tenantId } });
  },

  countOpen(tenantId: string) {
    return prisma.jobOrder.count({ where: { tenantId, status: "OPEN" } });
  },
};
