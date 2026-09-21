import { describe, expect, it, vi } from "vitest";

const calls: Record<string, unknown[]> = {};
const fake = (name: string, value: unknown) => (...args: unknown[]) => {
  calls[name] = args;
  return Promise.resolve(value);
};

vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: { count: fake("candidates", 32), countThisWeek: fake("thisWeek", 3) },
}));
vi.mock("../repositories/jobOrder.repository", () => ({ jobOrderRepository: { countOpen: fake("openJobs", 4) } }));
vi.mock("../repositories/submission.repository", () => ({ submissionRepository: { count: fake("submissions", 2) } }));
vi.mock("../repositories/dashboard.repository", () => ({
  dashboardRepository: {
    openOpenings: fake("openings", 7),
    submissionsByStatus: fake("pipeline", [{ status: "SHORTLISTED", count: 2 }]),
    skillGaps: fake("gaps", [{ skill: "docker", demand: 3, supply: 1 }]),
    rolesNeedingAttention: fake("roles", [{ id: "j1", title: "DevOps", openings: 1, candidates: 0, shortlisted: 0 }]),
  },
}));

const { dashboardService } = await import("./dashboard.service");

describe("dashboardService.overview", () => {
  it("gathers every figure for one tenant, and only that tenant", async () => {
    const result = await dashboardService.overview("tenant-1");

    expect(result).toEqual({
      totals: { candidates: 32, addedThisWeek: 3, openJobOrders: 4, openings: 7, submissions: 2 },
      pipeline: [{ status: "SHORTLISTED", count: 2 }],
      skillGaps: [{ skill: "docker", demand: 3, supply: 1 }],
      rolesNeedingAttention: [{ id: "j1", title: "DevOps", openings: 1, candidates: 0, shortlisted: 0 }],
    });
    for (const name of ["candidates", "thisWeek", "openJobs", "openings", "submissions", "pipeline", "gaps", "roles"]) {
      expect(calls[name]![0], `${name} must be scoped to the tenant`).toBe("tenant-1");
    }
  });
});
