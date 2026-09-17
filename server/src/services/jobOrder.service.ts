import {
  jobOrderRepository,
  JobOrderListParams,
} from "../repositories/jobOrder.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { skillRepository } from "../repositories/skill.repository";
import { NotFoundError } from "../lib/errors";

export interface CreateJobOrderServiceInput {
  tenantId: string;
  title: string;
  clientName?: string;
  location: string;
  minExperience: number;
  numberOfOpenings: number;
  skills: string[];
}

export interface UpdateJobOrderServiceInput {
  title?: string;
  clientName?: string;
  location?: string;
  minExperience?: number;
  numberOfOpenings?: number;
  status?: "OPEN" | "CLOSED";
  skills?: string[];
}

export const jobOrderService = {
  list(tenantId: string, params: JobOrderListParams) {
    return jobOrderRepository.findMany(tenantId, params);
  },

  async getById(tenantId: string, id: string) {
    const jobOrder = await jobOrderRepository.findById(tenantId, id);
    if (!jobOrder) throw new NotFoundError("Job order");
    return jobOrder;
  },

  async create(input: CreateJobOrderServiceInput) {
    const skills = await skillRepository.findOrCreateMany(input.skills);
    return jobOrderRepository.create({
      tenantId: input.tenantId,
      title: input.title,
      clientName: input.clientName,
      location: input.location,
      minExperience: input.minExperience,
      numberOfOpenings: input.numberOfOpenings,
      skillIds: skills.map((s) => s.id),
    });
  },

  async update(tenantId: string, id: string, input: UpdateJobOrderServiceInput) {
    const existing = await jobOrderRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Job order");

    const skillIds = input.skills
      ? (await skillRepository.findOrCreateMany(input.skills)).map((s) => s.id)
      : undefined;

    return jobOrderRepository.update(id, {
      title: input.title,
      clientName: input.clientName,
      location: input.location,
      minExperience: input.minExperience,
      numberOfOpenings: input.numberOfOpenings,
      status: input.status,
      skillIds,
    });
  },

  async delete(tenantId: string, id: string) {
    const existing = await jobOrderRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundError("Job order");
    await jobOrderRepository.delete(id);
  },

  /**
   * Candidates ranked by required-skill match count, tenant-scoped, zero
   * matches excluded. Also flags which of them are already shortlisted for
   * this job order so the UI can render the Shortlist button state.
   */
  async matchingCandidates(tenantId: string, jobOrderId: string) {
    const jobOrder = await jobOrderRepository.findById(tenantId, jobOrderId);
    if (!jobOrder) throw new NotFoundError("Job order");

    const [matchCounts, submissions] = await Promise.all([
      jobOrderRepository.findMatchCounts(tenantId, jobOrderId),
      submissionRepository.findByJobOrder(tenantId, jobOrderId),
    ]);

    const candidates = await jobOrderRepository.findCandidatesByIds(
      matchCounts.map((m) => m.candidateId)
    );
    const candidateById = new Map(candidates.map((c) => [c.id, c]));
    const submissionByCandidateId = new Map(submissions.map((s) => [s.candidateId, s]));

    // matchCounts is already ranked by the SQL query (ORDER BY matchCount DESC).
    const ranked = matchCounts.flatMap(({ candidateId, matchCount, matchedSkillNames }) => {
      const candidate = candidateById.get(candidateId);
      if (!candidate) return [];
      const submission = submissionByCandidateId.get(candidateId);
      return [
        {
          candidate,
          matchCount,
          matchedSkillNames,
          shortlisted: Boolean(submission),
          submissionStatus: submission?.status ?? null,
        },
      ];
    });

    return {
      jobOrder,
      matchingCandidates: ranked,
      shortlistedCandidates: ranked.filter((row) => row.shortlisted),
    };
  },
};
