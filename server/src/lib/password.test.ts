import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes with a salt, so the same password gives different hashes", async () => {
    const [a, b] = await Promise.all([hashPassword("Correct-Horse-1"), hashPassword("Correct-Horse-1")]);
    expect(a).not.toBe(b);
    expect(a.startsWith("$2")).toBe(true);
    expect(a).not.toContain("Correct-Horse-1");
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    expect(await verifyPassword("Correct-Horse-1", hash)).toBe(true);
    expect(await verifyPassword("correct-horse-1", hash)).toBe(false);
  });

  it("returns false when there is no stored hash (unknown user), without throwing", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
  });
});
