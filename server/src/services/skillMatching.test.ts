import { describe, expect, it } from "vitest";
import { computeMatch } from "./skillMatching";

function skill(name: string) {
  return { skill: { id: name, name } };
}

describe("computeMatch", () => {
  it("counts and lists the intersection of candidate and required skills", () => {
    const candidateSkills = [skill("react"), skill("node.js"), skill("python")];
    const requiredSkills = [skill("react"), skill("sql")];

    const result = computeMatch(candidateSkills, requiredSkills);

    expect(result.matchCount).toBe(1);
    expect(result.matchedSkillNames).toEqual(["react"]);
  });

  it("returns zero matches when there is no overlap", () => {
    const result = computeMatch([skill("java")], [skill("python")]);

    expect(result.matchCount).toBe(0);
    expect(result.matchedSkillNames).toEqual([]);
  });

  it("matches every required skill the candidate has, order preserved from candidate list", () => {
    const candidateSkills = [skill("sql"), skill("react"), skill("aws")];
    const requiredSkills = [skill("react"), skill("sql"), skill("aws")];

    const result = computeMatch(candidateSkills, requiredSkills);

    expect(result.matchCount).toBe(3);
    expect(result.matchedSkillNames).toEqual(["sql", "react", "aws"]);
  });

  it("handles empty candidate or required skill lists without throwing", () => {
    expect(computeMatch([], [skill("react")])).toEqual({ matchCount: 0, matchedSkillNames: [] });
    expect(computeMatch([skill("react")], [])).toEqual({ matchCount: 0, matchedSkillNames: [] });
    expect(computeMatch([], [])).toEqual({ matchCount: 0, matchedSkillNames: [] });
  });

  it("does not double count a duplicated candidate skill matching once", () => {
    const result = computeMatch([skill("react"), skill("react")], [skill("react")]);
    expect(result.matchCount).toBe(2);
  });
});
