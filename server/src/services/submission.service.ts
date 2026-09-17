import {
  submissionRepository,
  SubmissionListParams,
} from "../repositories/submission.repository";
import { jobOrderRepository } from "../repositories/jobOrder.repository";
import { candidateRepository } from "../repositories/candidate.repository";
import { computeMatch } from "./skillMatching";
import { ConflictError, NotFoundError } from "../lib/errors";

export const submissionService = {
  list(tenantId: string, params: SubmissionListParams) {
    return submissionRepository.findMany(tenantId, params);
  },

  async summary(tenantId: string) {
    const [total, shortlistedCount] = await Promise.all([
      submissionRepository.count(tenantId),
      submissionRepository.countShortlisted(tenantId),
    ]);
    return { total, shortlistedCount };
  },

  /**
   * Shortlisting a candidate for a job order creates the Submission record.
   * matchCount is recomputed server-side rather than trusted from the
   * client, so it stays correct even if the candidate/job order skills
   * changed since the matching list was rendered.
   */
  async shortlist(tenantId: string, jobOrderId: string, candidateId: string) {
    const [jobOrder, candidate] = await Promise.all([
      jobOrderRepository.findById(tenantId, jobOrderId),
      candidateRepository.findById(tenantId, candidateId),
    ]);
    if (!jobOrder) throw new NotFoundError("Job order");
    if (!candidate) throw new NotFoundError("Candidate");

    const existing = await submissionRepository.findByCandidateAndJobOrder(candidateId, jobOrderId);
    if (existing) throw new ConflictError("Candidate is already shortlisted for this job order");

    const { matchCount } = computeMatch(candidate.skills, jobOrder.requiredSkills);

    return submissionRepository.create({ tenantId, candidateId, jobOrderId, matchCount });
  },
};
