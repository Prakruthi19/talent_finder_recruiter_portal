import { describe, expect, it } from "vitest";
import { formatExperience } from "./format";

describe("formatExperience", () => {
  it("pluralizes years by default", () => {
    expect(formatExperience(5)).toBe("5 yrs");
    expect(formatExperience(0)).toBe("0 yrs");
  });

  it("uses singular 'yr' for exactly 1", () => {
    expect(formatExperience(1)).toBe("1 yr");
  });

  it("accepts a Prisma Decimal string as input", () => {
    expect(formatExperience("3")).toBe("3 yrs");
    expect(formatExperience("1")).toBe("1 yr");
  });
});
