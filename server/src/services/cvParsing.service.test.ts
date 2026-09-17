import { describe, expect, it, vi, beforeEach } from "vitest";

const verifyCvFileType = vi.fn();
const extractCvText = vi.fn();
const findAllNames = vi.fn();
const extractCandidateFields = vi.fn();

vi.mock("../lib/fileTypeCheck", () => ({
  verifyCvFileType: (...args: unknown[]) => verifyCvFileType(...args),
}));
vi.mock("../lib/cvTextExtractor", () => ({
  extractCvText: (...args: unknown[]) => extractCvText(...args),
}));
vi.mock("../repositories/skill.repository", () => ({
  skillRepository: { findAllNames: (...args: unknown[]) => findAllNames(...args) },
}));
vi.mock("../lib/cvFieldExtractor", () => ({
  extractCandidateFields: (...args: unknown[]) => extractCandidateFields(...args),
}));

const { cvParsingService } = await import("./cvParsing.service");

describe("cvParsingService.parse", () => {
  beforeEach(() => {
    verifyCvFileType.mockReset();
    extractCvText.mockReset();
    findAllNames.mockReset();
    extractCandidateFields.mockReset();
  });

  it("returns readable: false when extracted text is nearly empty (e.g. a scanned CV)", async () => {
    verifyCvFileType.mockResolvedValue("pdf");
    extractCvText.mockResolvedValue("   \n  ");

    const result = await cvParsingService.parse(Buffer.from("fake-pdf-bytes"));

    expect(result).toEqual({ readable: false });
    expect(findAllNames).not.toHaveBeenCalled();
  });

  it("extracts fields against the tenant's known skills when text is readable", async () => {
    verifyCvFileType.mockResolvedValue("docx");
    extractCvText.mockResolvedValue(
      "Jane Doe, jane@example.com, 5 years of experience with React and SQL."
    );
    findAllNames.mockResolvedValue(["react", "sql"]);
    extractCandidateFields.mockReturnValue({
      fullName: "Jane Doe",
      email: "jane@example.com",
      experienceYears: 5,
      skills: ["react", "sql"],
    });

    const result = await cvParsingService.parse(Buffer.from("fake-docx-bytes"));

    expect(result.readable).toBe(true);
    expect(result.fields).toEqual({
      fullName: "Jane Doe",
      email: "jane@example.com",
      experienceYears: 5,
      skills: ["react", "sql"],
    });
    expect(extractCandidateFields).toHaveBeenCalledWith(expect.any(String), ["react", "sql"]);
  });

  it("propagates the file-type check's rejection for a non-CV file", async () => {
    verifyCvFileType.mockRejectedValue(new Error("not a supported CV format"));

    await expect(cvParsingService.parse(Buffer.from("not-a-cv"))).rejects.toThrow(
      "not a supported CV format"
    );
    expect(extractCvText).not.toHaveBeenCalled();
  });
});
