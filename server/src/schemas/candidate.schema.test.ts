import { describe, expect, it } from "vitest";
import { createCandidateSchema } from "./candidate.schema";

describe("createCandidateSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = createCandidateSchema.safeParse({
      fullName: "Jane Doe",
      experienceYears: "5",
      skills: ["React"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing full name", () => {
    const result = createCandidateSchema.safeParse({
      experienceYears: "5",
      skills: ["React"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty skills array", () => {
    const result = createCandidateSchema.safeParse({
      fullName: "Jane Doe",
      experienceYears: "5",
      skills: [],
    });
    expect(result.success).toBe(false);
  });

  it("coerces a single skill string (multipart form field) into a one-item array", () => {
    const result = createCandidateSchema.safeParse({
      fullName: "Jane Doe",
      experienceYears: "5",
      skills: "React",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.skills).toEqual(["React"]);
  });

  it("rejects negative experience", () => {
    const result = createCandidateSchema.safeParse({
      fullName: "Jane Doe",
      experienceYears: "-1",
      skills: ["React"],
    });
    expect(result.success).toBe(false);
  });

  it("treats an empty-string optional email as undefined rather than an invalid email", () => {
    const result = createCandidateSchema.safeParse({
      fullName: "Jane Doe",
      email: "",
      experienceYears: "5",
      skills: ["React"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeUndefined();
  });
});
