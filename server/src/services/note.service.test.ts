import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError } from "../lib/errors";

const findCandidateById = vi.fn();
const findSubmissionById = vi.fn();
const findByCandidate = vi.fn();
const createForCandidate = vi.fn();
const findBySubmission = vi.fn();
const createForSubmission = vi.fn();

vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: { findById: (...args: unknown[]) => findCandidateById(...args) },
}));
vi.mock("../repositories/submission.repository", () => ({
  submissionRepository: { findById: (...args: unknown[]) => findSubmissionById(...args) },
}));
vi.mock("../repositories/note.repository", () => ({
  noteRepository: {
    findByCandidate: (...args: unknown[]) => findByCandidate(...args),
    createForCandidate: (...args: unknown[]) => createForCandidate(...args),
    findBySubmission: (...args: unknown[]) => findBySubmission(...args),
    createForSubmission: (...args: unknown[]) => createForSubmission(...args),
  },
}));

const { noteService } = await import("./note.service");

describe("noteService.addToCandidate", () => {
  beforeEach(() => {
    findCandidateById.mockReset();
    createForCandidate.mockReset();
  });

  it("throws NotFoundError when the candidate doesn't belong to this tenant", async () => {
    findCandidateById.mockResolvedValue(null);

    await expect(noteService.addToCandidate("tenant-1", "user-1", "cand-1", "called them")).rejects.toThrow(
      NotFoundError
    );
    expect(createForCandidate).not.toHaveBeenCalled();
  });

  it("creates the note scoped to the tenant and author", async () => {
    findCandidateById.mockResolvedValue({ id: "cand-1" });
    createForCandidate.mockResolvedValue({ id: "note-1" });

    await noteService.addToCandidate("tenant-1", "user-1", "cand-1", "called them");

    expect(createForCandidate).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      candidateId: "cand-1",
      authorId: "user-1",
      body: "called them",
    });
  });
});

describe("noteService.addToSubmission", () => {
  beforeEach(() => {
    findSubmissionById.mockReset();
    createForSubmission.mockReset();
  });

  it("throws NotFoundError when the submission doesn't belong to this tenant", async () => {
    findSubmissionById.mockResolvedValue(null);

    await expect(noteService.addToSubmission("tenant-1", "user-1", "sub-1", "moved to offer")).rejects.toThrow(
      NotFoundError
    );
    expect(createForSubmission).not.toHaveBeenCalled();
  });

  it("creates the note scoped to the tenant and author", async () => {
    findSubmissionById.mockResolvedValue({ id: "sub-1" });
    createForSubmission.mockResolvedValue({ id: "note-1" });

    await noteService.addToSubmission("tenant-1", "user-1", "sub-1", "moved to offer");

    expect(createForSubmission).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      submissionId: "sub-1",
      authorId: "user-1",
      body: "moved to offer",
    });
  });
});
