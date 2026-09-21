import { Prisma } from "@prisma/client";
import { prisma, tenantTransaction } from "../lib/prisma";
import { PageParams, PageResult, toSkip } from "./pagination";

export type CandidateSortBy = "fullName" | "location" | "experienceYears" | "createdAt";
export type SortDir = "asc" | "desc";

export interface CandidateListParams extends PageParams {
  search?: string;
  sortBy?: CandidateSortBy;
  sortDir?: SortDir;
}

const candidateWithSkills = {
  include: { skills: { include: { skill: true } } },
} satisfies Prisma.CandidateDefaultArgs;

const candidateWithDetails = {
  include: {
    skills: { include: { skill: true } },
    submissions: { include: { jobOrder: true } },
  },
} satisfies Prisma.CandidateDefaultArgs;

export type CandidateWithSkills = Prisma.CandidateGetPayload<typeof candidateWithSkills>;
export type CandidateWithDetails = Prisma.CandidateGetPayload<typeof candidateWithDetails>;

export interface CandidateFilters {
  /** Every listed skill is required (exact names, like the core matching). */
  skills: string[];
  location?: string;
  minExperience?: number;
  maxExperience?: number;
  nameContains?: string;
}

export interface CreateCandidateInput {
  tenantId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  experienceYears: number;
  cvPath?: string | null;
  cvOriginalName?: string | null;
  skillIds: string[];
}

export interface UpdateCandidateInput {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  experienceYears?: number;
  skillIds?: string[];
}

export const candidateRepository = {
  async findMany(
    tenantId: string,
    { search, page, pageSize, sortBy = "createdAt", sortDir = "desc" }: CandidateListParams
  ): Promise<PageResult<CandidateWithSkills>> {
    const where: Prisma.CandidateWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { skills: { some: { skill: { name: { contains: search.toLowerCase() } } } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CandidateOrderByWithRelationInput =
      sortBy === "fullName"
        ? { fullName: sortDir }
        : sortBy === "location"
        ? { location: sortDir }
        : sortBy === "experienceYears"
        ? { experienceYears: sortDir }
        : { createdAt: sortDir };

    const [items, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy,
        skip: toSkip({ page, pageSize }),
        take: pageSize,
        ...candidateWithSkills,
      }),
      prisma.candidate.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  findById(tenantId: string, id: string): Promise<CandidateWithDetails | null> {
    return prisma.candidate.findFirst({
      where: { id, tenantId },
      ...candidateWithDetails,
    });
  },

  /** Email identifies a candidate within a tenant; compared case-insensitively. */
  findByEmail(tenantId: string, email: string, excludeId?: string) {
    return prisma.candidate.findFirst({
      where: {
        tenantId,
        email: { equals: email, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  /** Structured search (used by the natural-language search). Always scoped to the tenant. */
  async findByFilters(tenantId: string, filters: CandidateFilters, limit = 25) {
    const where: Prisma.CandidateWhereInput = {
      tenantId,
      AND: [
        ...filters.skills.map((name) => ({ skills: { some: { skill: { name } } } })),
        ...(filters.location ? [{ location: { contains: filters.location, mode: "insensitive" as const } }] : []),
        ...(filters.minExperience !== undefined ? [{ experienceYears: { gte: filters.minExperience } }] : []),
        ...(filters.maxExperience !== undefined ? [{ experienceYears: { lte: filters.maxExperience } }] : []),
        ...(filters.nameContains
          ? [{ fullName: { contains: filters.nameContains, mode: "insensitive" as const } }]
          : []),
      ],
    };
    const [items, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        orderBy: [{ experienceYears: "desc" }, { fullName: "asc" }],
        take: limit,
        ...candidateWithSkills,
      }),
      prisma.candidate.count({ where }),
    ]);
    return { items, total };
  },

  countThisWeek(tenantId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return prisma.candidate.count({ where: { tenantId, createdAt: { gte: weekAgo } } });
  },

  count(tenantId: string) {
    return prisma.candidate.count({ where: { tenantId } });
  },

  create(data: CreateCandidateInput): Promise<CandidateWithSkills> {
    return prisma.candidate.create({
      data: {
        tenantId: data.tenantId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        experienceYears: data.experienceYears,
        cvPath: data.cvPath,
        cvOriginalName: data.cvOriginalName,
        skills: { create: data.skillIds.map((skillId) => ({ skillId })) },
      },
      ...candidateWithSkills,
    });
  },

  async update(id: string, data: UpdateCandidateInput): Promise<CandidateWithSkills> {
    // tenantTransaction, not prisma.$transaction: it carries the tenant context for row-level security.
    return tenantTransaction(async (tx) => {
      if (data.skillIds) {
        await tx.candidateSkill.deleteMany({ where: { candidateId: id } });
      }
      return tx.candidate.update({
        where: { id },
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          experienceYears: data.experienceYears,
          ...(data.skillIds
            ? { skills: { create: data.skillIds.map((skillId) => ({ skillId })) } }
            : {}),
        },
        ...candidateWithSkills,
      });
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.candidate.delete({ where: { id } });
  },
};
