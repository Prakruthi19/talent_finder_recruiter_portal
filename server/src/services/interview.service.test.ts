import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError } from "../lib/errors";

const findSubmissionById = vi.fn();
const countBySubmission = vi.fn();
const createInterview = vi.fn();
const findInterviewById = vi.fn();
const updateInterview = vi.fn();

vi.mock("../repositories/submission.repository", () => ({
  submissionRepository: { findById: (...args: unknown[]) => findSubmissionById(...args) },
}));
vi.mock("../repositories/interview.repository", () => ({
  interviewRepository: {
    countBySubmission: (...args: unknown[]) => countBySubmission(...args),
    create: (...args: unknown[]) => createInterview(...args),
    findById: (...args: unknown[]) => findInterviewById(...args),
    update: (...args: unknown[]) => updateInterview(...args),
  },
}));

const { interviewService } = await import("./interview.service");

describe("interviewService.schedule", () => {
  beforeEach(() => {
    findSubmissionById.mockReset();
    countBySubmission.mockReset();
    createInterview.mockReset();
  });

  it("throws NotFoundError when the submission doesn't belong to this tenant", async () => {
    findSubmissionById.mockResolvedValue(null);

    await expect(
      interviewService.schedule("tenant-1", "sub-1", { scheduledAt: new Date(), mode: "VIDEO" })
    ).rejects.toThrow(NotFoundError);
    expect(createInterview).not.toHaveBeenCalled();
  });

  it("assigns round = existing count + 1, never trusting a client-supplied round", async () => {
    findSubmissionById.mockResolvedValue({ id: "sub-1" });
    countBySubmission.mockResolvedValue(2);
    const scheduledAt = new Date("2026-10-01T10:00:00Z");
    createInterview.mockResolvedValue({ id: "int-1", round: 3 });

    await interviewService.schedule("tenant-1", "sub-1", { scheduledAt, mode: "VIDEO", notes: "panel round" });

    expect(createInterview).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      submissionId: "sub-1",
      round: 3,
      scheduledAt,
      mode: "VIDEO",
      notes: "panel round",
    });
  });
});

describe("interviewService.updateStatus", () => {
  beforeEach(() => {
    findInterviewById.mockReset();
    updateInterview.mockReset();
  });

  it("throws NotFoundError when the interview doesn't belong to this tenant", async () => {
    findInterviewById.mockResolvedValue(null);

    await expect(interviewService.updateStatus("tenant-1", "int-1", { status: "COMPLETED" })).rejects.toThrow(
      NotFoundError
    );
    expect(updateInterview).not.toHaveBeenCalled();
  });

  it("updates an interview that belongs to this tenant", async () => {
    findInterviewById.mockResolvedValue({ id: "int-1", tenantId: "tenant-1" });
    updateInterview.mockResolvedValue({ id: "int-1", status: "COMPLETED" });

    const result = await interviewService.updateStatus("tenant-1", "int-1", { status: "COMPLETED" });

    expect(updateInterview).toHaveBeenCalledWith("int-1", { status: "COMPLETED" });
    expect(result).toEqual({ id: "int-1", status: "COMPLETED" });
  });
});
