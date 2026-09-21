import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyCvFileType = vi.fn();
const extractCvText = vi.fn();
const findAllNames = vi.fn();
const extractCandidateFields = vi.fn();
const extractFieldsWithAi = vi.fn();

class FakeCvReadError extends Error {
  constructor(public reason: "password_protected" | "corrupt") {
    super(reason);
  }
}

vi.mock("../lib/fileTypeCheck", () => ({
  verifyCvFileType: (...args: unknown[]) => verifyCvFileType(...args),
}));
vi.mock("../lib/cvTextExtractor", () => ({
  extractCvText: (...args: unknown[]) => extractCvText(...args),
  CvReadError: FakeCvReadError,
}));
vi.mock("../repositories/skill.repository", () => ({
  skillRepository: { findAllNames: (...args: unknown[]) => findAllNames(...args) },
}));
vi.mock("../lib/cvFieldExtractor", () => ({
  extractCandidateFields: (...args: unknown[]) => extractCandidateFields(...args),
}));
vi.mock("../lib/cvAiExtractor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/cvAiExtractor")>()),
  extractFieldsWithAi: (...args: unknown[]) => extractFieldsWithAi(...args),
}));

const { cvParsingService } = await import("./cvParsing.service");

const READABLE_TEXT = "Jane Doe, jane@example.com, 5 years of experience with React and SQL in production systems.";

describe("cvParsingService.parse", () => {
  beforeEach(() => {
    verifyCvFileType.mockReset();
    extractCvText.mockReset();
    findAllNames.mockReset();
    extractCandidateFields.mockReset();
    extractFieldsWithAi.mockReset();
  });

  it("returns readable: false when there is no real text (e.g. a scanned CV)", async () => {
    verifyCvFileType.mockResolvedValue("pdf");
    extractCvText.mockResolvedValue("   \n  ");

    const result = await cvParsingService.parse(Buffer.from("fake-pdf-bytes"));

    expect(result).toMatchObject({ readable: false, reason: "empty" });
    expect(findAllNames).not.toHaveBeenCalled();
  });

  it("does not let PDF page markers make an image-only CV look readable", async () => {
    verifyCvFileType.mockResolvedValue("pdf");
    // 50+ characters, but not one letter of actual content.
    extractCvText.mockResolvedValue("-- 1 of 3 --\n\n-- 2 of 3 --\n\n-- 3 of 3 --\n\n   \n\n  ");

    const result = await cvParsingService.parse(Buffer.from("fake-pdf-bytes"));

    expect(result.readable).toBe(false);
    expect(result.reason).toBe("empty");
  });

  it("reports a password-protected or damaged file with its own reason instead of failing", async () => {
    verifyCvFileType.mockResolvedValue("pdf");
    extractCvText.mockRejectedValueOnce(new FakeCvReadError("password_protected"));
    expect(await cvParsingService.parse(Buffer.from("x"))).toEqual({ readable: false, reason: "password_protected" });

    extractCvText.mockRejectedValueOnce(new FakeCvReadError("corrupt"));
    expect(await cvParsingService.parse(Buffer.from("x"))).toEqual({ readable: false, reason: "corrupt" });
  });

  it("still surfaces genuinely unexpected errors", async () => {
    verifyCvFileType.mockResolvedValue("pdf");
    extractCvText.mockRejectedValue(new Error("disk on fire"));
    await expect(cvParsingService.parse(Buffer.from("x"))).rejects.toThrow("disk on fire");
  });

  it("extracts fields against the known skills when text is readable", async () => {
    verifyCvFileType.mockResolvedValue("docx");
    extractCvText.mockResolvedValue(READABLE_TEXT);
    findAllNames.mockResolvedValue(["react", "sql"]);
    const fields = { fullName: "Jane Doe", email: "jane@example.com", experienceYears: 5, skills: ["react", "sql"], suggestedSkills: [] };
    extractCandidateFields.mockReturnValue(fields);

    const result = await cvParsingService.parse(Buffer.from("fake-docx-bytes"));

    expect(result.readable).toBe(true);
    expect(result.fields).toEqual(fields);
    expect(result.diagnostics).toMatchObject({ aiUsed: false });
    expect(result.diagnostics!.letters).toBeGreaterThan(40);
    expect(extractCandidateFields).toHaveBeenCalledWith(expect.any(String), ["react", "sql"], expect.anything());
    expect(extractFieldsWithAi).not.toHaveBeenCalled();
  });

  it("only calls the AI when explicitly asked, then merges its answer over the heuristics", async () => {
    verifyCvFileType.mockResolvedValue("docx");
    extractCvText.mockResolvedValue(READABLE_TEXT);
    findAllNames.mockResolvedValue(["react", "sql"]);
    extractCandidateFields.mockReturnValue({ email: "jane@example.com", skills: ["react"], suggestedSkills: [] });
    extractFieldsWithAi.mockResolvedValue({ fullName: "Jane Doe", experienceYears: 7, skills: ["SQL", "rust"] });

    const result = await cvParsingService.parse(Buffer.from("x"), { useAi: true });

    expect(extractFieldsWithAi).toHaveBeenCalledOnce();
    expect(result.fields).toMatchObject({
      fullName: "Jane Doe",
      email: "jane@example.com",
      experienceYears: 7,
      skills: ["react", "sql"],
      suggestedSkills: ["rust"],
    });
    expect(result.diagnostics!.aiUsed).toBe(true);
  });

  it("propagates the file-type check's rejection for a non-CV file", async () => {
    verifyCvFileType.mockRejectedValue(new Error("not a supported CV format"));

    await expect(cvParsingService.parse(Buffer.from("not-a-cv"))).rejects.toThrow("not a supported CV format");
    expect(extractCvText).not.toHaveBeenCalled();
  });
});
