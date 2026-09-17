import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError } from "../lib/errors";

const findJobOrderById = vi.fn();
const findMatchCounts = vi.fn();
const findCandidatesByIds = vi.fn();
const jobOrderCount = vi.fn();
const jobOrderCountOpen = vi.fn();
const findByJobOrder = vi.fn();

vi.mock("../repositories/jobOrder.repository", () => ({
  jobOrderRepository: {
    findById: (...args: unknown[]) => findJobOrderById(...args),
    findMatchCounts: (...args: unknown[]) => findMatchCounts(...args),
    findCandidatesByIds: (...args: unknown[]) => findCandidatesByIds(...args),
    count: (...args: unknown[]) => jobOrderCount(...args),
    countOpen: (...args: unknown[]) => jobOrderCountOpen(...args),
  },
}));
vi.mock("../repositories/submission.repository", () => ({
  submissionRepository: { findByJobOrder: (...args: unknown[]) => findByJobOrder(...args) },
}));
vi.mock("../repositories/skill.repository", () => ({
  skillRepository: { findOrCreateMany: vi.fn() },
}));

const { jobOrderService } = await import("./jobOrder.service");

describe("jobOrderService.matchingCandidates", () => {
  beforeEach(() => {
    findJobOrderById.mockReset();
    findMatchCounts.mockReset();
    findCandidatesByIds.mockReset();
    findByJobOrder.mockReset();
  });

  it("throws NotFoundError when the job order doesn't belong to this tenant", async () => {
    findJobOrderById.mockResolvedValue(null);

    await expect(jobOrderService.matchingCandidates("tenant-1", "job-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("preserves the SQL-ranked order and flags already-shortlisted candidates", async () => {
    findJobOrderById.mockResolvedValue({ id: "job-1", requiredSkills: [] });
    findMatchCounts.mockResolvedValue([
      { candidateId: "c2", matchCount: 3, matchedSkillNames: ["react", "sql", "aws"] },
      { candidateId: "c1", matchCount: 1, matchedSkillNames: ["react"] },
    ]);
    findCandidatesByIds.mockResolvedValue([
      { id: "c1", fullName: "Low Match" },
      { id: "c2", fullName: "High Match" },
    ]);
    findByJobOrder.mockResolvedValue([
      { candidateId: "c1", status: "SHORTLISTED" },
    ]);

    const result = await jobOrderService.matchingCandidates("tenant-1", "job-1");

    // Order must follow matchCounts (SQL ORDER BY matchCount DESC), not the
    // order findCandidatesByIds happened to return rows in.
    expect(result.matchingCandidates.map((r) => r.candidate.id)).toEqual(["c2", "c1"]);
    expect(result.matchingCandidates[0]!.shortlisted).toBe(false);
    expect(result.matchingCandidates[1]!.shortlisted).toBe(true);
    expect(result.matchingCandidates[1]!.submissionStatus).toBe("SHORTLISTED");
    expect(result.shortlistedCandidates.map((r) => r.candidate.id)).toEqual(["c1"]);
  });

  it("drops a match row if the candidate was deleted between the two queries", async () => {
    findJobOrderById.mockResolvedValue({ id: "job-1", requiredSkills: [] });
    findMatchCounts.mockResolvedValue([
      { candidateId: "ghost", matchCount: 2, matchedSkillNames: ["react"] },
    ]);
    findCandidatesByIds.mockResolvedValue([]); // candidate no longer exists
    findByJobOrder.mockResolvedValue([]);

    const result = await jobOrderService.matchingCandidates("tenant-1", "job-1");

    expect(result.matchingCandidates).toEqual([]);
  });
});

describe("jobOrderService.summary", () => {
  it("aggregates total and open counts for the tenant", async () => {
    jobOrderCount.mockResolvedValue(7);
    jobOrderCountOpen.mockResolvedValue(4);

    const result = await jobOrderService.summary("tenant-1");

    expect(result).toEqual({ total: 7, openCount: 4 });
    expect(jobOrderCount).toHaveBeenCalledWith("tenant-1");
    expect(jobOrderCountOpen).toHaveBeenCalledWith("tenant-1");
  });
});
