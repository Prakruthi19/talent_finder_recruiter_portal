import { describe, expect, it } from "vitest";
import { canonicalSkill, editDistance } from "./cvSkillMatcher";

const KNOWN = ["react", "node.js", "typescript", "postgresql", "spring boot", "ci/cd", "sql"];

describe("canonicalSkill", () => {
  it("maps exact names, aliases and punctuation variants onto the database name", () => {
    expect(canonicalSkill("React", KNOWN)).toBe("react");
    expect(canonicalSkill("ReactJS", KNOWN)).toBe("react");
    expect(canonicalSkill("nodejs", KNOWN)).toBe("node.js");
    expect(canonicalSkill("Node JS", KNOWN)).toBe("node.js");
    expect(canonicalSkill("Postgres", KNOWN)).toBe("postgresql");
    expect(canonicalSkill("springboot", KNOWN)).toBe("spring boot");
    expect(canonicalSkill("CI CD", KNOWN)).toBe("ci/cd");
  });

  it("accepts a typo, but not a different word", () => {
    expect(canonicalSkill("Typescirpt", KNOWN)).toBe("typescript");
    expect(canonicalSkill("reactive", KNOWN)).toBeUndefined();
    expect(canonicalSkill("java", KNOWN)).toBeUndefined();
  });

  it("returns undefined for an unknown or empty skill", () => {
    expect(canonicalSkill("rust", KNOWN)).toBeUndefined();
    expect(canonicalSkill("  ", KNOWN)).toBeUndefined();
  });
});

describe("editDistance", () => {
  it("counts a swapped pair as one edit", () => {
    expect(editDistance("typescirpt", "typescript")).toBe(1);
    expect(editDistance("react", "react")).toBe(0);
    expect(editDistance("react", "reactt")).toBe(1);
    expect(editDistance("abc", "xyz")).toBe(3);
  });
});
