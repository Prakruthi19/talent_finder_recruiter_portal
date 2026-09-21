import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { EventEmitter } from "node:events";

const create = vi.fn();
const findMany = vi.fn();
vi.mock("../repositories/audit.repository", () => ({
  auditRepository: { create: (...a: unknown[]) => create(...a), findMany: (...a: unknown[]) => findMany(...a) },
}));

const { auditService, describeAction, extractEntityId, normalizePath } = await import("./audit.service");
const { auditTrail } = await import("../middleware/audit");

const ID = "11111111-2222-4333-8444-555555555555";

describe("action naming", () => {
  it("replaces record ids so the same kind of action always has the same key", () => {
    expect(normalizePath(`/api/job-orders/${ID}/shortlist`)).toBe("/api/job-orders/:id/shortlist");
    expect(normalizePath("/api/candidates/parse-cv?ai=true")).toBe("/api/candidates/parse-cv");
    expect(extractEntityId(`/api/candidates/${ID}`)).toBe(ID);
    expect(extractEntityId("/api/candidates")).toBeUndefined();
  });

  it("describes known actions in plain words and leaves unknown ones as-is", () => {
    expect(describeAction("POST /api/candidates")).toBe("Added a candidate");
    expect(describeAction("POST /api/job-orders/:id/shortlist")).toBe("Shortlisted a candidate");
    expect(describeAction("DELETE /api/candidates/:id")).toBe("Deleted a candidate");
    expect(describeAction("POST /api/ai/candidate-search")).toBe("Used an AI assistant");
    expect(describeAction("PUT /api/mystery")).toBe("PUT /api/mystery");
  });
});

describe("auditService", () => {
  beforeEach(() => {
    create.mockReset();
    findMany.mockReset();
  });

  it("never lets a failed audit write break the request that already succeeded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    create.mockRejectedValue(new Error("db down"));
    await expect(auditService.record({ action: "POST /api/candidates" })).resolves.toBeUndefined();
  });

  it("lists a tenant's activity with readable descriptions", async () => {
    findMany.mockResolvedValue({
      items: [{ id: "a1", createdAt: new Date("2026-09-21"), action: "POST /api/candidates", entityId: null, user: { name: "Ada", email: "a@b.co" } }],
      total: 1, page: 1, pageSize: 20,
    });
    const result = await auditService.list("tenant-1", { page: 1, pageSize: 20 });
    expect(findMany).toHaveBeenCalledWith("tenant-1", { page: 1, pageSize: 20 });
    expect(result.items[0]).toMatchObject({ description: "Added a candidate", user: { name: "Ada" } });
  });
});

describe("auditTrail middleware", () => {
  beforeEach(() => create.mockReset().mockResolvedValue(undefined));

  const run = async (req: Partial<Request>, status: number, locals: Record<string, unknown> = {}) => {
    const res = Object.assign(new EventEmitter(), { statusCode: status, locals }) as unknown as Response;
    const next = vi.fn();
    auditTrail({ method: "POST", originalUrl: "/api/candidates", ...req } as Request, res, next);
    res.emit("finish");
    await new Promise((r) => setImmediate(r));
    expect(next).toHaveBeenCalledOnce();
  };

  it("records a successful write with who, where and what", async () => {
    await run({ user: { id: "u1" }, tenantId: "t1", originalUrl: `/api/candidates/${ID}`, method: "PATCH" }, 200);
    expect(create).toHaveBeenCalledWith({
      tenantId: "t1", userId: "u1", action: "PATCH /api/candidates/:id", entityId: ID, meta: { status: 200 },
    });
  });

  it("ignores reads", async () => {
    await run({ method: "GET", user: { id: "u1" } }, 200);
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores failed requests: they changed nothing", async () => {
    await run({ user: { id: "u1" } }, 403);
    await run({ user: { id: "u1" } }, 500);
    expect(create).not.toHaveBeenCalled();
  });

  it("ignores anonymous requests", async () => {
    await run({}, 200);
    expect(create).not.toHaveBeenCalled();
  });

  it("attributes a login to the user the controller identified", async () => {
    await run({ originalUrl: "/api/auth/login" }, 200, { actorId: "u9" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: "u9", action: "POST /api/auth/login" }));
  });
});
