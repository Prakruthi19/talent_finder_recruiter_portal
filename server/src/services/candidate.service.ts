import fs from "node:fs/promises";
import {
  candidateRepository,
  CandidateListParams,
} from "../repositories/candidate.repository";
import { skillRepository } from "../repositories/skill.repository";
import { ConflictError, NotFoundError } from "../lib/errors";

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

async function assertEmailAvailable(tenantId: string, email: string, excludeId?: string) {
  const existing = await candidateRepository.findByEmail(tenantId, email, excludeId);
  if (existing) {
    throw new ConflictError(`A candidate with the email "${email}" already exists in this tenant`);
  }
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
    // Checked first so a rejected duplicate doesn't leave new Skill rows behind.
    // Email is optional; a candidate without one can't be matched, so is never a duplicate.
    if (input.email) await assertEmailAvailable(input.tenantId, input.email);
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

    // Only when the email actually changes: the edit form resends it on every
    // save, and re-checking an unchanged email would just find the candidate itself.
    if (input.email && input.email.toLowerCase() !== existing.email?.toLowerCase()) {
      await assertEmailAvailable(tenantId, input.email, id);
    }

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
