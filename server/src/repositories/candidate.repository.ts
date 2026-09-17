import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
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
    return prisma.$transaction(async (tx) => {
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
