import { candidateRepository } from "../repositories/candidate.repository";
import { jobOrderRepository } from "../repositories/jobOrder.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { dashboardRepository } from "../repositories/dashboard.repository";

export const dashboardService = {
  /** Everything the Dashboard page shows, for one tenant. Counts only: no personal data. */
  async overview(tenantId: string) {
    const [
      candidates,
      addedThisWeek,
      openJobOrders,
      openings,
      submissions,
      pipeline,
      skillGaps,
      rolesNeedingAttention,
      staleSubmission,
    ] = await Promise.all([
      candidateRepository.count(tenantId),
      candidateRepository.countThisWeek(tenantId),
      jobOrderRepository.countOpen(tenantId),
      dashboardRepository.openOpenings(tenantId),
      submissionRepository.count(tenantId),
      dashboardRepository.submissionsByStatus(tenantId),
      dashboardRepository.skillGaps(tenantId),
      dashboardRepository.rolesNeedingAttention(tenantId),
      submissionRepository.findMostStale(tenantId),
    ]);

    return {
      totals: { candidates, addedThisWeek, openJobOrders, openings, submissions },
      pipeline,
      skillGaps,
      rolesNeedingAttention,
      staleSubmission,
    };
  },
};
