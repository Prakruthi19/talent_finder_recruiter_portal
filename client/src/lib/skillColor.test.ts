import { describe, expect, it } from "vitest";
import { getSkillColorClasses } from "./skillColor";

describe("getSkillColorClasses", () => {
  it("returns the same color classes for the same skill name every time", () => {
    const first = getSkillColorClasses("react");
    const second = getSkillColorClasses("react");
    expect(first).toBe(second);
  });

  it("returns non-empty class strings for arbitrary skill names", () => {
    for (const name of ["react", "sql", "python", "node.js", "aws"]) {
      expect(getSkillColorClasses(name).length).toBeGreaterThan(0);
    }
  });

  it("never returns a red/green class (reserved for status and match semantics)", () => {
    const names = ["react", "sql", "python", "node.js", "aws", "java", "docker", "kubernetes"];
    for (const name of names) {
      const classes = getSkillColorClasses(name);
      expect(classes).not.toMatch(/\bred-/);
      expect(classes).not.toMatch(/\bemerald-/);
      expect(classes).not.toMatch(/\bgreen-/);
    }
  });
});
