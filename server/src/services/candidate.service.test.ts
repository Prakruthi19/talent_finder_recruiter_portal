import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError } from "../lib/errors";

const findById = vi.fn();
const createCandidate = vi.fn();
const deleteCandidate = vi.fn();
const findOrCreateMany = vi.fn();
const unlink = vi.fn();

vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: {
    findById: (...args: unknown[]) => findById(...args),
    create: (...args: unknown[]) => createCandidate(...args),
    delete: (...args: unknown[]) => deleteCandidate(...args),
  },
}));
vi.mock("../repositories/skill.repository", () => ({
  skillRepository: { findOrCreateMany: (...args: unknown[]) => findOrCreateMany(...args) },
}));
vi.mock("node:fs/promises", () => {
  const unlinkMock = (...args: unknown[]) => unlink(...args);
  return { default: { unlink: unlinkMock }, unlink: unlinkMock };
});

const { candidateService } = await import("./candidate.service");

describe("candidateService.create", () => {
  beforeEach(() => {
    findOrCreateMany.mockReset();
    createCandidate.mockReset();
  });

  it("resolves skill names to Skill rows before creating the candidate", async () => {
    findOrCreateMany.mockResolvedValue([{ id: "skill-1" }, { id: "skill-2" }]);
    createCandidate.mockResolvedValue({ id: "cand-1" });

    await candidateService.create({
      tenantId: "tenant-1",
      fullName: "Jane Doe",
      experienceYears: 5,
      skills: ["React", "SQL"],
    });

    expect(findOrCreateMany).toHaveBeenCalledWith(["React", "SQL"]);
    expect(createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({ skillIds: ["skill-1", "skill-2"] })
    );
  });
});

describe("candidateService.delete", () => {
  beforeEach(() => {
    findById.mockReset();
    deleteCandidate.mockReset();
    unlink.mockReset().mockResolvedValue(undefined);
  });

  it("throws NotFoundError when the candidate doesn't belong to this tenant", async () => {
    findById.mockResolvedValue(null);

    await expect(candidateService.delete("tenant-1", "cand-1")).rejects.toThrow(NotFoundError);
    expect(deleteCandidate).not.toHaveBeenCalled();
  });

  it("deletes the DB row and unlinks the uploaded CV file when one exists", async () => {
    findById.mockResolvedValue({ id: "cand-1", cvPath: "/uploads/abc.pdf" });

    await candidateService.delete("tenant-1", "cand-1");

    expect(deleteCandidate).toHaveBeenCalledWith("cand-1");
    expect(unlink).toHaveBeenCalledWith("/uploads/abc.pdf");
  });

  it("skips the file unlink when the candidate never had a CV", async () => {
    findById.mockResolvedValue({ id: "cand-1", cvPath: null });

    await candidateService.delete("tenant-1", "cand-1");

    expect(unlink).not.toHaveBeenCalled();
  });
});
