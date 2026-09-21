import { describe, expect, it } from "vitest";
import { redactPii } from "./redact";

describe("redactPii", () => {
  it("removes emails, phone numbers and profile links", () => {
    const out = redactPii("Write to jane@example.com or call +1 (555) 123-4567. See https://linkedin.com/in/jane and github.com/jane.");
    expect(out).not.toMatch(/jane@example\.com|555|linkedin|github/);
    expect(out).toContain("[email]");
    expect(out).toContain("[phone]");
    expect(out).toContain("[link]");
  });

  it("removes the person's whole name and each part of it, any case", () => {
    const out = redactPii("Jane Doe led the team. JANE said DOE would join. Jane's manager agreed.", "Jane Doe");
    expect(out.toLowerCase()).not.toContain("jane");
    expect(out.toLowerCase()).not.toContain("doe");
  });

  it("leaves the useful content alone, and ignores very short name parts", () => {
    const out = redactPii("Built React apps for 6 years at Acme.", "Al Bo");
    expect(out).toBe("Built React apps for 6 years at Acme.");
  });

  it("does not choke on regex characters in a name", () => {
    expect(() => redactPii("hello", "J.(Doe)*")).not.toThrow();
  });

  it("does not mistake a year range for a phone number", () => {
    expect(redactPii("Worked at Acme 2015 - 2019")).toBe("Worked at Acme 2015 - 2019");
  });
});
