import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { loginAccountKey } from "./rateLimit";

const withBody = (body: unknown) => ({ body }) as Request;

describe("loginAccountKey", () => {
  it("keys by the lowercased, trimmed email so case/whitespace variants share one bucket", () => {
    expect(loginAccountKey(withBody({ email: "Ada@Example.com" }))).toBe("ada@example.com");
    expect(loginAccountKey(withBody({ email: "  ada@example.com  " }))).toBe("ada@example.com");
    expect(loginAccountKey(withBody({ email: "ADA@EXAMPLE.COM" }))).toBe(loginAccountKey(withBody({ email: "ada@example.com" })));
  });

  it("different accounts get different keys", () => {
    expect(loginAccountKey(withBody({ email: "a@x.co" }))).not.toBe(loginAccountKey(withBody({ email: "b@x.co" })));
  });

  it("falls back to a shared bucket for a request with no usable email, without throwing", () => {
    expect(loginAccountKey(withBody({}))).toBe("no-email");
    expect(loginAccountKey(withBody({ email: "   " }))).toBe("no-email");
    expect(loginAccountKey(withBody({ email: 12345 }))).toBe("no-email");
    expect(loginAccountKey(withBody(undefined))).toBe("no-email");
    expect(loginAccountKey({} as Request)).toBe("no-email");
  });
});
