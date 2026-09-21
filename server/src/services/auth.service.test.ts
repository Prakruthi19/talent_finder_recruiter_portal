import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { hashPassword } from "../lib/password";
import { verifyToken } from "../lib/jwt";

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";

const findByEmail = vi.fn();
const findUserById = vi.fn();
const countUsers = vi.fn();
const createUser = vi.fn();
const findMembership = vi.fn();
const findMembershipsByUser = vi.fn();
const upsertMembership = vi.fn();
const findAllTenants = vi.fn();

vi.mock("../repositories/user.repository", () => ({
  userRepository: {
    findByEmail: (...a: unknown[]) => findByEmail(...a),
    findById: (...a: unknown[]) => findUserById(...a),
    count: (...a: unknown[]) => countUsers(...a),
    create: (...a: unknown[]) => createUser(...a),
  },
}));
vi.mock("../repositories/membership.repository", () => ({
  membershipRepository: {
    find: (...a: unknown[]) => findMembership(...a),
    findByUser: (...a: unknown[]) => findMembershipsByUser(...a),
    upsert: (...a: unknown[]) => upsertMembership(...a),
  },
}));
vi.mock("../repositories/tenant.repository", () => ({
  tenantRepository: { findAll: (...a: unknown[]) => findAllTenants(...a) },
}));

const auth = await import("./auth.service");

let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hashPassword("Correct-Horse-1");
});

const user = () => ({ id: "user-1", email: "a@b.co", name: "Ada", passwordHash });

describe("auth.login", () => {
  beforeEach(() => {
    findByEmail.mockReset();
    findUserById.mockReset().mockResolvedValue(user());
    findMembershipsByUser.mockReset().mockResolvedValue([
      { role: "ADMIN", tenant: { id: "t1", name: "LinkedIn", status: "ACTIVE" } },
      { role: "RECRUITER", tenant: { id: "t2", name: "Monster", status: "ACTIVE" } },
    ]);
  });

  it("returns a token for the user plus their tenants and roles", async () => {
    findByEmail.mockResolvedValue(user());

    const result = await auth.login("a@b.co", "Correct-Horse-1");

    expect(verifyToken(result.token)).toBe("user-1");
    expect(result.user).toEqual({ id: "user-1", email: "a@b.co", name: "Ada" });
    expect(result.tenants).toEqual([
      { id: "t1", name: "LinkedIn", status: "ACTIVE", role: "ADMIN" },
      { id: "t2", name: "Monster", status: "ACTIVE", role: "RECRUITER" },
    ]);
    // The password hash must never leave the service.
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });

  it("rejects a wrong password with a generic message", async () => {
    findByEmail.mockResolvedValue(user());
    await expect(auth.login("a@b.co", "wrong-password")).rejects.toThrow("Invalid email or password");
  });

  it("gives the identical error for an unknown email, so accounts can't be enumerated", async () => {
    findByEmail.mockResolvedValue(null);
    const unknown = await auth.login("nobody@b.co", "Correct-Horse-1").catch((e) => e);
    findByEmail.mockResolvedValue(user());
    const wrong = await auth.login("a@b.co", "wrong-password").catch((e) => e);

    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect(unknown.message).toBe(wrong.message);
    expect(unknown.statusCode).toBe(wrong.statusCode);
  });
});

describe("auth.requireMembership", () => {
  beforeEach(() => {
    findMembership.mockReset();
  });

  it("returns the user's role in that tenant", async () => {
    findMembership.mockResolvedValue({ role: "RECRUITER" });
    await expect(auth.requireMembership("user-1", "t1")).resolves.toBe("RECRUITER");
    expect(findMembership).toHaveBeenCalledWith("user-1", "t1");
  });

  it("throws ForbiddenError when the user is not a member of the tenant", async () => {
    findMembership.mockResolvedValue(null);
    await expect(auth.requireMembership("user-1", "someone-elses-tenant")).rejects.toThrow(ForbiddenError);
  });
});

describe("auth.bootstrapAdmin", () => {
  beforeEach(() => {
    countUsers.mockReset().mockResolvedValue(0);
    createUser.mockReset().mockResolvedValue({ id: "u-new" });
    upsertMembership.mockReset();
    findAllTenants.mockReset().mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
  });

  const env = { BOOTSTRAP_ADMIN_EMAIL: "Root@Example.com", BOOTSTRAP_ADMIN_PASSWORD: "Sup3r-Secret!" };

  it("does nothing without credentials in the environment", async () => {
    expect(await auth.bootstrapAdmin({})).toMatch(/skipped/);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("does nothing when the password is too short", async () => {
    expect(await auth.bootstrapAdmin({ ...env, BOOTSTRAP_ADMIN_PASSWORD: "short" })).toMatch(/too short/);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("never creates a second admin once any user exists", async () => {
    countUsers.mockResolvedValue(1);
    expect(await auth.bootstrapAdmin(env)).toMatch(/already exist/);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates one hashed, lowercased admin who administers every tenant", async () => {
    await auth.bootstrapAdmin(env);

    const created = createUser.mock.calls[0]![0] as { email: string; passwordHash: string };
    expect(created.email).toBe("root@example.com");
    expect(created.passwordHash).not.toContain("Sup3r-Secret!");
    expect(upsertMembership).toHaveBeenCalledWith("u-new", "t1", "ADMIN");
    expect(upsertMembership).toHaveBeenCalledWith("u-new", "t2", "ADMIN");
  });
});
