import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "../lib/errors";

const findByName = vi.fn();
const createWithAdmin = vi.fn();
const findById = vi.fn();
const findManyForUser = vi.fn();
const countForUser = vi.fn();
const countActiveForUser = vi.fn();

vi.mock("../repositories/tenant.repository", () => ({
  tenantRepository: {
    findByName: (...args: unknown[]) => findByName(...args),
    createWithAdmin: (...args: unknown[]) => createWithAdmin(...args),
    findById: (...args: unknown[]) => findById(...args),
    findManyForUser: (...args: unknown[]) => findManyForUser(...args),
    countForUser: (...args: unknown[]) => countForUser(...args),
    countActiveForUser: (...args: unknown[]) => countActiveForUser(...args),
  },
}));

const { tenantService } = await import("./tenant.service");

describe("tenantService.create", () => {
  beforeEach(() => {
    findByName.mockReset();
    createWithAdmin.mockReset();
  });

  it("throws ConflictError when a tenant with the same name already exists", async () => {
    findByName.mockResolvedValue({ id: "t1", name: "LinkedIn" });

    await expect(tenantService.create("user-1", { name: "LinkedIn" })).rejects.toThrow(ConflictError);
    expect(createWithAdmin).not.toHaveBeenCalled();
  });

  it("creates the tenant with the creator as its admin when the name is unique", async () => {
    findByName.mockResolvedValue(null);
    createWithAdmin.mockResolvedValue({ id: "t1", name: "Monster" });

    const result = await tenantService.create("user-1", { name: "Monster" });

    expect(result).toEqual({ id: "t1", name: "Monster" });
    expect(createWithAdmin).toHaveBeenCalledWith("user-1", "Monster");
  });
});

describe("tenantService.list", () => {
  it("only lists tenants for the signed-in user", async () => {
    findManyForUser.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    await tenantService.list("user-1", { page: 1, pageSize: 10, search: "link" });

    expect(findManyForUser).toHaveBeenCalledWith("user-1", { page: 1, pageSize: 10, search: "link" });
  });
});

describe("tenantService.getById", () => {
  beforeEach(() => {
    findById.mockReset();
  });

  it("throws NotFoundError when the tenant doesn't exist", async () => {
    findById.mockResolvedValue(null);
    await expect(tenantService.getById("missing")).rejects.toThrow(NotFoundError);
  });
});

describe("tenantService.summary", () => {
  it("aggregates total and active counts for the user's tenants", async () => {
    countForUser.mockResolvedValue(5);
    countActiveForUser.mockResolvedValue(3);

    const result = await tenantService.summary("user-1");

    expect(result).toEqual({ total: 5, activeCount: 3 });
    expect(countForUser).toHaveBeenCalledWith("user-1");
  });
});
