import { describe, expect, it, vi, beforeEach } from "vitest";
import { ConflictError, NotFoundError } from "../lib/errors";

const findByName = vi.fn();
const create = vi.fn();
const findById = vi.fn();
const count = vi.fn();
const countActive = vi.fn();

vi.mock("../repositories/tenant.repository", () => ({
  tenantRepository: {
    findByName: (...args: unknown[]) => findByName(...args),
    create: (...args: unknown[]) => create(...args),
    findById: (...args: unknown[]) => findById(...args),
    count: (...args: unknown[]) => count(...args),
    countActive: (...args: unknown[]) => countActive(...args),
  },
}));

const { tenantService } = await import("./tenant.service");

describe("tenantService.create", () => {
  beforeEach(() => {
    findByName.mockReset();
    create.mockReset();
  });

  it("throws ConflictError when a tenant with the same name already exists", async () => {
    findByName.mockResolvedValue({ id: "t1", name: "LinkedIn" });

    await expect(tenantService.create({ name: "LinkedIn" })).rejects.toThrow(ConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the tenant when the name is unique", async () => {
    findByName.mockResolvedValue(null);
    create.mockResolvedValue({ id: "t1", name: "Monster" });

    const result = await tenantService.create({ name: "Monster" });

    expect(result).toEqual({ id: "t1", name: "Monster" });
    expect(create).toHaveBeenCalledWith({ name: "Monster" });
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
  it("aggregates total and active counts", async () => {
    count.mockResolvedValue(5);
    countActive.mockResolvedValue(3);

    const result = await tenantService.summary();

    expect(result).toEqual({ total: 5, activeCount: 3 });
  });
});
