import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors";
import { assertJwtConfigured, signOAuthState, signToken, verifyOAuthState, verifyToken } from "./jwt";

const SECRET = "test-secret-that-is-at-least-32-characters-long";

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

describe("jwt", () => {
  it("round-trips a user id", () => {
    expect(verifyToken(signToken("user-1"))).toBe("user-1");
  });

  it("rejects a token that was tampered with", () => {
    const [header, , signature] = signToken("user-1").split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "someone-else" })).toString("base64url");
    expect(() => verifyToken(`${header}.${forgedPayload}.${signature}`)).toThrow(UnauthorizedError);
  });

  it("rejects a token signed with a different secret", () => {
    const foreign = jwt.sign({}, "another-secret-that-is-also-32-chars-long!!", { subject: "user-1" });
    expect(() => verifyToken(foreign)).toThrow(UnauthorizedError);
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(() => verifyToken(expired)).toThrow(UnauthorizedError);
  });

  it("rejects an unsigned (alg: none) token", () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "user-1" })}.`;
    expect(() => verifyToken(unsigned)).toThrow(UnauthorizedError);
  });

  it("rejects a token signed with an algorithm other than HS256", () => {
    const hs512 = jwt.sign({}, SECRET, { algorithm: "HS512", subject: "user-1" });
    expect(() => verifyToken(hs512)).toThrow(UnauthorizedError);
  });

  it("rejects garbage", () => {
    expect(() => verifyToken("not-a-token")).toThrow(UnauthorizedError);
  });

  it("round-trips the OAuth state nonce", () => {
    expect(verifyOAuthState(signOAuthState("nonce-123"))).toBe("nonce-123");
  });

  it("does not accept a login token as OAuth state, or the reverse", () => {
    expect(() => verifyOAuthState(signToken("user-1"))).toThrow(UnauthorizedError);
    expect(() => verifyToken(signOAuthState("nonce"))).toThrow(UnauthorizedError);
  });

  it("rejects forged or expired OAuth state", () => {
    expect(() => verifyOAuthState("garbage")).toThrow(UnauthorizedError);
    const expired = jwt.sign({ purpose: "oauth-state", nonce: "n", exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect(() => verifyOAuthState(expired)).toThrow(UnauthorizedError);
  });

  it("refuses to run without a strong secret", () => {
    delete process.env.JWT_SECRET;
    expect(() => assertJwtConfigured()).toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = "too-short";
    expect(() => assertJwtConfigured()).toThrow(/at least 32/);
  });
});
