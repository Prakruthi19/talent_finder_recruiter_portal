import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "../lib/errors";

const findById = vi.fn();
const findByEmail = vi.fn();
const createCandidate = vi.fn();
const updateCandidate = vi.fn();
const deleteCandidate = vi.fn();
const findOrCreateMany = vi.fn();
const unlink = vi.fn();

vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: {
    findById: (...args: unknown[]) => findById(...args),
    findByEmail: (...args: unknown[]) => findByEmail(...args),
    create: (...args: unknown[]) => createCandidate(...args),
    update: (...args: unknown[]) => updateCandidate(...args),
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

describe("candidateService duplicate detection (by email)", () => {
  beforeEach(() => {
    findById.mockReset();
    findByEmail.mockReset().mockResolvedValue(null);
    findOrCreateMany.mockReset().mockResolvedValue([]);
    createCandidate.mockReset().mockResolvedValue({ id: "cand-new" });
    updateCandidate.mockReset().mockResolvedValue({ id: "cand-1" });
  });

  const newCandidate = {
    tenantId: "tenant-1",
    fullName: "Asha Menon",
    email: "asha@example.com",
    experienceYears: 5,
    skills: ["react"],
  };

  it("rejects creating a candidate whose email already exists in the tenant", async () => {
    findByEmail.mockResolvedValue({ id: "cand-existing" });

    await expect(candidateService.create(newCandidate)).rejects.toThrow(ConflictError);
    expect(findByEmail).toHaveBeenCalledWith("tenant-1", "asha@example.com", undefined);
    // Rejected before any Skill rows or the candidate are written.
    expect(findOrCreateMany).not.toHaveBeenCalled();
    expect(createCandidate).not.toHaveBeenCalled();
  });

  it("creates the candidate when the email is not taken", async () => {
    await candidateService.create(newCandidate);

    expect(createCandidate).toHaveBeenCalled();
  });

  it("does not check for duplicates when no email is given", async () => {
    await candidateService.create({ ...newCandidate, email: undefined });

    expect(findByEmail).not.toHaveBeenCalled();
    expect(createCandidate).toHaveBeenCalled();
  });

  it("rejects changing an email to one that is taken, excluding the candidate itself", async () => {
    findById.mockResolvedValue({ id: "cand-1", email: "old@example.com" });
    findByEmail.mockResolvedValue({ id: "cand-2" });

    await expect(
      candidateService.update("tenant-1", "cand-1", { email: "asha@example.com" })
    ).rejects.toThrow(ConflictError);
    expect(findByEmail).toHaveBeenCalledWith("tenant-1", "asha@example.com", "cand-1");
    expect(updateCandidate).not.toHaveBeenCalled();
  });

  it("skips the check when the email is unchanged (the edit form resends it on every save)", async () => {
    findById.mockResolvedValue({ id: "cand-1", email: "asha@example.com" });

    await candidateService.update("tenant-1", "cand-1", { email: "ASHA@example.com", experienceYears: 6 });

    expect(findByEmail).not.toHaveBeenCalled();
    expect(updateCandidate).toHaveBeenCalled();
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
