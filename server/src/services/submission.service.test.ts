import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "../lib/errors";

const findJobOrderById = vi.fn();
const findCandidateById = vi.fn();
const findByCandidateAndJobOrder = vi.fn();
const createSubmission = vi.fn();

vi.mock("../repositories/jobOrder.repository", () => ({
  jobOrderRepository: { findById: (...args: unknown[]) => findJobOrderById(...args) },
}));
vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: { findById: (...args: unknown[]) => findCandidateById(...args) },
}));
const findSubmissionById = vi.fn();

vi.mock("../repositories/submission.repository", () => ({
  submissionRepository: {
    findByCandidateAndJobOrder: (...args: unknown[]) => findByCandidateAndJobOrder(...args),
    create: (...args: unknown[]) => createSubmission(...args),
    findById: (...args: unknown[]) => findSubmissionById(...args),
  },
}));

const { submissionService } = await import("./submission.service");

function skill(name: string) {
  return { skill: { id: name, name } };
}

describe("submissionService.shortlist", () => {
  beforeEach(() => {
    findJobOrderById.mockReset();
    findCandidateById.mockReset();
    findByCandidateAndJobOrder.mockReset();
    createSubmission.mockReset();
  });

  it("throws NotFoundError when the job order doesn't belong to this tenant", async () => {
    findJobOrderById.mockResolvedValue(null);
    findCandidateById.mockResolvedValue({ id: "cand-1", skills: [] });

    await expect(submissionService.shortlist("tenant-1", "job-1", "cand-1")).rejects.toThrow(
      NotFoundError
    );
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the candidate doesn't belong to this tenant", async () => {
    findJobOrderById.mockResolvedValue({ id: "job-1", requiredSkills: [] });
    findCandidateById.mockResolvedValue(null);

    await expect(submissionService.shortlist("tenant-1", "job-1", "cand-1")).rejects.toThrow(
      NotFoundError
    );
  });

  it("throws ConflictError when the candidate is already shortlisted for this job order", async () => {
    findJobOrderById.mockResolvedValue({ id: "job-1", requiredSkills: [] });
    findCandidateById.mockResolvedValue({ id: "cand-1", skills: [] });
    findByCandidateAndJobOrder.mockResolvedValue({ id: "existing-submission" });

    await expect(submissionService.shortlist("tenant-1", "job-1", "cand-1")).rejects.toThrow(
      ConflictError
    );
    expect(createSubmission).not.toHaveBeenCalled();
  });

  it("recomputes matchCount server-side rather than trusting a client-supplied value", async () => {
    findJobOrderById.mockResolvedValue({
      id: "job-1",
      requiredSkills: [skill("react"), skill("sql")],
    });
    findCandidateById.mockResolvedValue({
      id: "cand-1",
      skills: [skill("react"), skill("python")],
    });
    findByCandidateAndJobOrder.mockResolvedValue(null);
    createSubmission.mockResolvedValue({ id: "sub-1", matchCount: 1 });

    await submissionService.shortlist("tenant-1", "job-1", "cand-1");

    expect(createSubmission).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      candidateId: "cand-1",
      jobOrderId: "job-1",
      matchCount: 1,
    });
  });
});

describe("submissionService.getById", () => {
  beforeEach(() => {
    findSubmissionById.mockReset();
  });

  it("throws NotFoundError when the submission doesn't belong to this tenant", async () => {
    findSubmissionById.mockResolvedValue(null);

    await expect(submissionService.getById("tenant-1", "sub-1")).rejects.toThrow(NotFoundError);
  });

  it("returns the submission when it belongs to this tenant", async () => {
    findSubmissionById.mockResolvedValue({ id: "sub-1", tenantId: "tenant-1" });

    await expect(submissionService.getById("tenant-1", "sub-1")).resolves.toEqual({
      id: "sub-1",
      tenantId: "tenant-1",
    });
  });
});
