import { describe, expect, it } from "vitest";
import { extractCandidateFields } from "./cvFieldExtractor";

const KNOWN_SKILLS = ["react", "node.js", "sql", "python", "aws", "docker"];

describe("extractCandidateFields", () => {
  it("extracts an email address from the CV text", () => {
    const result = extractCandidateFields(
      "Jane Doe\njane.doe@example.com\n+1 555 123 4567",
      KNOWN_SKILLS
    );
    expect(result.email).toBe("jane.doe@example.com");
  });

  it("extracts a phone number from the CV text", () => {
    const result = extractCandidateFields("Contact: +1 555 123 4567", KNOWN_SKILLS);
    expect(result.phone).toContain("555");
  });

  it("extracts years of experience from a common phrasing", () => {
    const result = extractCandidateFields(
      "Software engineer with 5 years of experience building web apps.",
      KNOWN_SKILLS
    );
    expect(result.experienceYears).toBe(5);
  });

  it("extracts years of experience from a '5+ yrs exp' style phrasing", () => {
    const result = extractCandidateFields("5+ yrs exp in backend development", KNOWN_SKILLS);
    expect(result.experienceYears).toBe(5);
  });

  it("leaves experienceYears undefined when no such phrase exists", () => {
    const result = extractCandidateFields("A candidate with strong skills.", KNOWN_SKILLS);
    expect(result.experienceYears).toBeUndefined();
  });

  it("exact-matches known skills that appear verbatim in the text", () => {
    const result = extractCandidateFields(
      "Experienced with React, SQL and Python in production.",
      KNOWN_SKILLS
    );
    expect(result.skills).toEqual(expect.arrayContaining(["react", "sql", "python"]));
    expect(result.skills).not.toContain("aws");
  });

  it("does not return skills that never appear in the text at all", () => {
    const result = extractCandidateFields("Just a generic resume with no tech mentioned.", KNOWN_SKILLS);
    expect(result.skills).not.toContain("docker");
    expect(result.skills).not.toContain("aws");
  });

  it("does not fuzzy-match unrelated short words to unrelated skill names (regression: 'India' vs 'django')", () => {
    const result = extractCandidateFields(
      "Jane Doe, Bangalore, India. Software engineer.",
      [...KNOWN_SKILLS, "django"]
    );
    expect(result.skills).not.toContain("django");
  });

  it("returns an empty skills array when there are no known skills to match against", () => {
    const result = extractCandidateFields("React, SQL, Python", []);
    expect(result.skills).toEqual([]);
  });

  it("handles empty text without throwing", () => {
    const result = extractCandidateFields("", KNOWN_SKILLS);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.experienceYears).toBeUndefined();
    expect(result.skills).toEqual([]);
  });
});
