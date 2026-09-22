import { Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PageParams, PageResult, toSkip } from "./pagination";

export type SubmissionSortBy = "createdAt" | "status";
export type SortDir = "asc" | "desc";

export interface SubmissionListParams extends PageParams {
  search?: string;
  sortBy?: SubmissionSortBy;
  sortDir?: SortDir;
}

const submissionWithRelations = {
  include: { candidate: true, jobOrder: true },
} satisfies Prisma.SubmissionDefaultArgs;

export type SubmissionWithRelations = Prisma.SubmissionGetPayload<typeof submissionWithRelations>;

const submissionDetail = {
  include: { candidate: true, jobOrder: true, interviews: { orderBy: { round: "asc" } } },
} satisfies Prisma.SubmissionDefaultArgs;

export type SubmissionDetail = Prisma.SubmissionGetPayload<typeof submissionDetail>;

export const submissionRepository = {
  async findMany(
    tenantId: string,
    { search, page, pageSize, sortBy = "createdAt", sortDir = "desc" }: SubmissionListParams
  ): Promise<PageResult<SubmissionWithRelations>> {
    const where: Prisma.SubmissionWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { candidate: { fullName: { contains: search, mode: "insensitive" } } },
              { jobOrder: { title: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.SubmissionOrderByWithRelationInput =
      sortBy === "status" ? { status: sortDir } : { createdAt: sortDir };

    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy,
        skip: toSkip({ page, pageSize }),
        take: pageSize,
        ...submissionWithRelations,
      }),
      prisma.submission.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  findByCandidateAndJobOrder(candidateId: string, jobOrderId: string) {
    return prisma.submission.findUnique({
      where: { candidateId_jobOrderId: { candidateId, jobOrderId } },
    });
  },

  findById(tenantId: string, id: string): Promise<SubmissionDetail | null> {
    return prisma.submission.findFirst({
      where: { tenantId, id },
      ...submissionDetail,
    });
  },

  /** The longest-untouched submission still in an active (non-terminal) stage. Feeds the dashboard's stale-submission nudge. */
  findMostStale(tenantId: string, staleDays = 7): Promise<SubmissionWithRelations | null> {
    return prisma.submission.findFirst({
      where: {
        tenantId,
        status: { notIn: ["HIRED", "REJECTED"] },
        updatedAt: { lt: new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "asc" },
      ...submissionWithRelations,
    });
  },

  findByJobOrder(tenantId: string, jobOrderId: string): Promise<SubmissionWithRelations[]> {
    return prisma.submission.findMany({
      where: { tenantId, jobOrderId },
      ...submissionWithRelations,
      orderBy: { matchCount: "desc" },
    });
  },

  create(data: {
    tenantId: string;
    candidateId: string;
    jobOrderId: string;
    matchCount: number;
    status?: SubmissionStatus;
  }): Promise<SubmissionWithRelations> {
    return prisma.submission.create({
      data,
      ...submissionWithRelations,
    });
  },

  count(tenantId: string) {
    return prisma.submission.count({ where: { tenantId } });
  },

  countShortlisted(tenantId: string) {
    return prisma.submission.count({ where: { tenantId, status: "SHORTLISTED" } });
  },
};
