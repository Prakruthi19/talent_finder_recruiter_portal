import fs from "node:fs/promises";
import {
  candidateRepository,
  CandidateListParams,
} from "../repositories/candidate.repository";
import { skillRepository } from "../repositories/skill.repository";
import { NotFoundError } from "../lib/errors";

export interface CreateCandidateServiceInput {
  tenantId: string;
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  experienceYears: number;
  skills: string[];
  cvPath?: string;
  cvOriginalName?: string;
}

export interface UpdateCandidateServiceInput {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  experienceYears?: number;
  skills?: string[];
}

export const candidateService = {
  async list(tenantId: string, params: CandidateListParams) {
    return candidateRepository.findMany(tenantId, params);
  },

  async summary(tenantId: string) {
    const [total, addedThisWeek] = await Promise.all([
      candidateRepository.count(tenantId),
      candidateRepository.countThisWeek(tenantId),
    ]);
    return { total, addedThisWeek };
  },

  async getById(tenantId: string, id: string) {
    const candidate = await candidateRepository.findById(tenantId, id);
    if (!candidate) throw new NotFoundError("Candidate");
    return candidate;
  },

  async create(input: CreateCandidateServiceInput) {
    const skills = await skillRepository.findOrCreateMany(input.skills);
    return candidateRepository.create({
      tenantId: input.tenantId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      location: input.location,
      experienceYears: input.experienceYears,
      cvPath: input.cvPath,
      cvOriginalName: input.cvOriginalName,
      skillIds: skills.map((s) => s.id),
    });
  },

  async update(tenantId: string, id: string, input: UpdateCandidateServiceInput) {
    const existing = await candidateRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Candidate");

    const skillIds = input.skills
      ? (await skillRepository.findOrCreateMany(input.skills)).map((s) => s.id)
      : undefined;

    return candidateRepository.update(id, {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      location: input.location,
      experienceYears: input.experienceYears,
      skillIds,
    });
  },

  async delete(tenantId: string, id: string) {
    const existing = await candidateRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Candidate");

    await candidateRepository.delete(id);

    if (existing.cvPath) {
      await fs.unlink(existing.cvPath).catch(() => undefined);
    }
  },
};
