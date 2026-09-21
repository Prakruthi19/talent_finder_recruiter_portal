import { candidateRepository } from "../repositories/candidate.repository";
import { jobOrderRepository } from "../repositories/jobOrder.repository";
import { NotFoundError } from "../lib/errors";
import { computeMatch } from "./skillMatching";

/**
 * A candidate and a job order from the same tenant, with the exact-match
 * result already worked out. Every AI feature about a pairing starts here, so
 * they all describe the same match the ranking shows and can only ever touch
 * records that belong to this tenant.
 */
export async function loadMatchContext(tenantId: string, jobOrderId: string, candidateId: string) {
  const [jobOrder, candidate] = await Promise.all([
    jobOrderRepository.findById(tenantId, jobOrderId),
    candidateRepository.findById(tenantId, candidateId),
  ]);
  if (!jobOrder) throw new NotFoundError("Job order");
  if (!candidate) throw new NotFoundError("Candidate");

  const { matchedSkillNames } = computeMatch(candidate.skills, jobOrder.requiredSkills);
  const matched = new Set(matchedSkillNames);
  const missingSkillNames = jobOrder.requiredSkills.map((r) => r.skill.name).filter((name) => !matched.has(name));

  return { jobOrder, candidate, matchedSkillNames, missingSkillNames };
}
