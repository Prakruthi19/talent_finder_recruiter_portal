import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { signToken } from "../lib/jwt";

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

const requireMembership = vi.fn();
vi.mock("../services/auth.service", () => ({
  requireMembership: (...a: unknown[]) => requireMembership(...a),
}));

const { requireAuth, requireRole } = await import("./auth");
const { requireTenant } = await import("./tenantContext");

const TENANT = "11111111-1111-4111-8111-111111111111";

function fakeReq(headers: Record<string, string>, extra: Partial<Request> = {}): Request {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { header: (name: string) => lower[name.toLowerCase()], ...extra } as unknown as Request;
}

describe("requireAuth", () => {
  const res = {} as Response;

  it("rejects a request with no Authorization header", () => {
    expect(() => requireAuth(fakeReq({}), res, vi.fn())).toThrow(UnauthorizedError);
  });

  it("rejects a malformed or invalid bearer token", () => {
    expect(() => requireAuth(fakeReq({ Authorization: "Bearer nonsense" }), res, vi.fn())).toThrow(UnauthorizedError);
    expect(() => requireAuth(fakeReq({ Authorization: "Basic abc" }), res, vi.fn())).toThrow(UnauthorizedError);
  });

  it("accepts a valid token and exposes the user id", () => {
    const req = fakeReq({ Authorization: `Bearer ${signToken("user-1")}` });
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(req.user).toEqual({ id: "user-1" });
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireTenant (the forged-header defence)", () => {
  beforeEach(() => {
    requireMembership.mockReset();
  });
  const res = {} as Response;
  const run = (req: Request) =>
    new Promise<unknown>((resolve) => requireTenant(req, res, (err?: unknown) => resolve(err)));

  it("rejects an unauthenticated request", async () => {
    expect(await run(fakeReq({ "X-Tenant-Id": TENANT }))).toBeInstanceOf(UnauthorizedError);
  });

  it("requires the X-Tenant-Id header", async () => {
    const err = (await run(fakeReq({}, { user: { id: "u1" } }))) as { statusCode: number };
    expect(err.statusCode).toBe(400);
  });

  it("rejects a header that isn't a UUID", async () => {
    const err = (await run(fakeReq({ "X-Tenant-Id": "abc" }, { user: { id: "u1" } }))) as { statusCode: number };
    expect(err.statusCode).toBe(400);
    expect(requireMembership).not.toHaveBeenCalled();
  });

  it("returns 403 when the user sets the header to a tenant they don't belong to", async () => {
    requireMembership.mockImplementation(async () => {
      throw new ForbiddenError("You don't have access to this tenant");
    });
    const req = fakeReq({ "X-Tenant-Id": TENANT }, { user: { id: "u1" } });

    expect(await run(req)).toBeInstanceOf(ForbiddenError);
    expect(requireMembership).toHaveBeenCalledWith("u1", TENANT);
    expect(req.tenantId).toBeUndefined();
  });

  it("accepts a member and records the tenant and their role", async () => {
    requireMembership.mockResolvedValue("RECRUITER");
    const req = fakeReq({ "X-Tenant-Id": TENANT }, { user: { id: "u1" } });

    expect(await run(req)).toBeUndefined();
    expect(req.tenantId).toBe(TENANT);
    expect(req.role).toBe("RECRUITER");
  });
});

describe("requireRole", () => {
  const res = {} as Response;

  it("lets an admin through", () => {
    const next = vi.fn();
    requireRole("ADMIN")({ role: "ADMIN" } as Request, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("blocks a recruiter from an admin-only action", () => {
    expect(() => requireRole("ADMIN")({ role: "RECRUITER" } as Request, res, vi.fn())).toThrow(ForbiddenError);
  });

  it("blocks a request with no role at all", () => {
    expect(() => requireRole("ADMIN")({} as Request, res, vi.fn())).toThrow(ForbiddenError);
  });
});
