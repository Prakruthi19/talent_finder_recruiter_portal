import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Proves the database itself keeps tenants apart, by attacking it the way a
 * buggy query would: with NO `where tenantId` at all. Needs a real Postgres that
 * has had the migrations applied:
 *
 *   RLS_TEST_DATABASE_URL=postgresql://user:pass@host:port/rls_scratch npm run test:rls
 *
 * Safety: refuses any database whose name doesn't start with "rls_".
 */
const url = process.env.RLS_TEST_DATABASE_URL;
const dbName = url ? new URL(url).pathname.replace("/", "") : "";
if (url && !/^rls_/.test(dbName)) {
  throw new Error(`Refusing to run against "${dbName}": the RLS test database name must start with "rls_"`);
}
if (url) process.env.DATABASE_URL = url; // must be set before the app's Prisma client is created

const app = url ? await import("../src/lib/prisma") : undefined;
const scope = url ? await import("../src/lib/tenantScope") : undefined;
const repos = url
  ? {
      candidate: (await import("../src/repositories/candidate.repository")).candidateRepository,
      jobOrder: (await import("../src/repositories/jobOrder.repository")).jobOrderRepository,
      dashboard: (await import("../src/repositories/dashboard.repository")).dashboardRepository,
      audit: (await import("../src/repositories/audit.repository")).auditRepository,
    }
  : undefined;

const RUN = `rlstest-${Date.now()}`;

describe.skipIf(!url)(`row-level security on a real database (${dbName})`, () => {
  const { prisma, tenantTransaction, scopedQueryRaw, initRls } = app!;
  const { runWithTenant } = scope!;
  const asTenant = runWithTenant;

  // Setup goes through a separate client so the app's own client stays under test.
  // On a database where the connecting role is the table owner, even setup is bound
  // by RLS (FORCE), so every setup write states its tenant too.
  const admin = new PrismaClient({ datasourceUrl: url });
  const inTenant = <T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
    admin.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
      return fn(tx);
    });

  let A = "";
  let B = "";
  let candA: string[] = [];
  let candB: string[] = [];
  let jobA = "";
  let jobB = "";
  let skillId = "";

  async function seedTenant(name: string) {
    const tenant = await admin.tenant.create({ data: { name: `${RUN}-${name}` } });
    const { candidates, job } = await inTenant(tenant.id, async (tx) => {
      const candidates = [];
      for (const n of [1, 2]) {
        candidates.push(
          await tx.candidate.create({
            data: { tenantId: tenant.id, fullName: `${name} Candidate ${n}`, experienceYears: 5, skills: { create: [{ skillId }] } },
          })
        );
      }
      const job = await tx.jobOrder.create({
        data: {
          tenantId: tenant.id, title: `${name} Job`, location: "Anywhere", minExperience: 1, numberOfOpenings: 1,
          requiredSkills: { create: [{ skillId }] },
        },
      });
      await tx.submission.create({ data: { tenantId: tenant.id, candidateId: candidates[0]!.id, jobOrderId: job.id, matchCount: 1 } });
      await tx.auditLog.createMany({ data: [{ tenantId: tenant.id, action: `rlstest ${name}` }] });
      return { candidates, job };
    });
    return { id: tenant.id, candidates: candidates.map((c) => c.id), job: job.id };
  }

  beforeAll(async () => {
    const status = await initRls();
    expect(status.problems, "RLS must be enforced for these tests to mean anything").toEqual([]);
    const skill = await admin.skill.upsert({ where: { name: `${RUN}-skill` }, update: {}, create: { name: `${RUN}-skill` } });
    skillId = skill.id;
    const a = await seedTenant("A");
    const b = await seedTenant("B");
    ({ id: A, candidates: candA, job: jobA } = a);
    ({ id: B, candidates: candB, job: jobB } = b);
  });

  afterAll(async () => {
    // Deleting the tenants cascades to everything they own.
    await admin.tenant.deleteMany({ where: { name: { startsWith: RUN } } });
    await admin.skill.deleteMany({ where: { name: { startsWith: RUN } } });
    await admin.$disconnect();
    await prisma.$disconnect();
  });

  describe("the connection really is bound by RLS", () => {
    it("reports enforced, and (when told what to expect) uses the expected mode", async () => {
      const status = await initRls();
      expect(status).toMatchObject({ enforced: true, problems: [] });
      if (process.env.RLS_TEST_EXPECT_APP_ROLE) {
        expect(status.usingAppRole).toBe(process.env.RLS_TEST_EXPECT_APP_ROLE === "true");
      }
    });

    it("runs queries as a role that cannot bypass RLS", async () => {
      const [row] = await asTenant(A, () =>
        scopedQueryRaw<{ user: string; rolsuper: boolean; rolbypassrls: boolean }[]>(
          Prisma.sql`SELECT current_user::text AS user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user`
        )
      );
      expect(row).toMatchObject({ rolsuper: false, rolbypassrls: false });
    });
  });

  describe("reads: a query with NO tenant filter still only sees its own tenant", () => {
    it("findMany() with no where clause", async () => {
      const seenByA = await asTenant(A, () => prisma.candidate.findMany());
      expect(seenByA.map((c) => c.id).sort()).toEqual([...candA].sort());
      const seenByB = await asTenant(B, () => prisma.candidate.findMany());
      expect(seenByB.map((c) => c.id).sort()).toEqual([...candB].sort());
    });

    it("every tenant-owned table, not just candidates", async () => {
      expect(await asTenant(A, () => prisma.jobOrder.findMany())).toHaveLength(1);
      expect(await asTenant(A, () => prisma.submission.findMany())).toHaveLength(1);
      expect((await asTenant(A, () => prisma.jobOrder.findMany()))[0]!.id).toBe(jobA);
      expect(await asTenant(A, () => prisma.candidateSkill.findMany())).toHaveLength(2);
      expect(await asTenant(A, () => prisma.jobOrderRequiredSkill.findMany())).toHaveLength(1);
    });

    it("looking a row up by another tenant's id finds nothing", async () => {
      expect(await asTenant(A, () => prisma.candidate.findUnique({ where: { id: candB[0]! } }))).toBeNull();
      expect(await asTenant(A, () => prisma.jobOrder.findUnique({ where: { id: jobB } }))).toBeNull();
    });

    it("counts and aggregates are scoped too", async () => {
      expect(await asTenant(A, () => prisma.candidate.count())).toBe(2);
      const agg = await asTenant(A, () => prisma.jobOrder.aggregate({ _count: true }));
      expect(agg._count).toBe(1);
    });

    it("raw SQL through scopedQueryRaw is scoped even with no WHERE", async () => {
      const [row] = await asTenant(A, () => scopedQueryRaw<{ n: number }[]>(Prisma.sql`SELECT count(*)::int AS n FROM candidates`));
      expect(row!.n).toBe(2);
    });

    it("with no tenant at all, nothing is visible (fail closed)", async () => {
      expect(await asTenant(null, () => prisma.candidate.findMany())).toEqual([]);
      expect(await prisma.candidate.findMany()).toEqual([]); // not even inside a scope
      expect(await asTenant(null, () => prisma.submission.count())).toBe(0);
    });
  });

  describe("writes: another tenant's rows cannot be changed or created", () => {
    it("cannot update another tenant's row", async () => {
      await expect(
        asTenant(A, () => prisma.candidate.update({ where: { id: candB[0]! }, data: { fullName: "hijacked" } }))
      ).rejects.toThrow();
      const untouched = await admin.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${B}, true)`;
        return tx.candidate.findUnique({ where: { id: candB[0]! } });
      });
      expect(untouched?.fullName).not.toBe("hijacked");
    });

    it("cannot delete another tenant's row", async () => {
      await expect(asTenant(A, () => prisma.candidate.delete({ where: { id: candB[0]! } }))).rejects.toThrow();
      expect(await asTenant(B, () => prisma.candidate.count())).toBe(2);
    });

    it("cannot insert a row that belongs to another tenant", async () => {
      await expect(
        asTenant(A, () => prisma.candidate.create({ data: { tenantId: B, fullName: "planted", experienceYears: 1 } }))
      ).rejects.toThrow(/row-level security|violates/i);
    });

    it("cannot attach a skill to another tenant's candidate", async () => {
      await expect(
        asTenant(A, () => prisma.candidateSkill.create({ data: { candidateId: candB[1]!, skillId } }))
      ).rejects.toThrow();
    });

    it("cannot move one of its own rows into another tenant", async () => {
      await expect(
        asTenant(A, () => prisma.candidate.update({ where: { id: candA[0]! }, data: { tenantId: B } }))
      ).rejects.toThrow();
    });

    it("a blanket deleteMany() with no where only ever touches its own tenant", async () => {
      const throwaway = await seedTenant("C");
      const result = await asTenant(throwaway.id, () => prisma.candidate.deleteMany());
      expect(result.count).toBe(2);
      // A and B are untouched.
      expect(await asTenant(A, () => prisma.candidate.count())).toBe(2);
      expect(await asTenant(B, () => prisma.candidate.count())).toBe(2);
    });

    it("a legitimate write in its own tenant still works", async () => {
      const created = await asTenant(A, () =>
        prisma.candidate.create({ data: { tenantId: A, fullName: "legit", experienceYears: 2, skills: { create: [{ skillId }] } } })
      );
      expect(created.tenantId).toBe(A);
      await asTenant(A, () => prisma.candidate.delete({ where: { id: created.id } }));
    });
  });

  describe("the app's real repositories work under RLS, and stay in their tenant", () => {
    it("candidate list and detail", async () => {
      const page = await asTenant(A, () => repos!.candidate.findMany(A, { page: 1, pageSize: 10 }));
      expect(page.total).toBe(2);
      expect(await asTenant(A, () => repos!.candidate.findById(A, candB[0]!))).toBeNull();
    });

    it("the exact-match ranking query", async () => {
      const rows = await asTenant(A, () => repos!.jobOrder.findMatchCounts(A, jobA));
      expect(rows.map((r) => r.candidateId).sort()).toEqual([...candA].sort());
      // Asking about another tenant's job order yields nothing, whatever tenant id is passed.
      expect(await asTenant(A, () => repos!.jobOrder.findMatchCounts(A, jobB))).toEqual([]);
      expect(await asTenant(A, () => repos!.jobOrder.findMatchCounts(B, jobB))).toEqual([]);
    });

    it("the dashboard queries", async () => {
      const gaps = await asTenant(A, () => repos!.dashboard.skillGaps(A));
      expect(gaps).toEqual([{ skill: `${RUN}-skill`, demand: 1, supply: 2 }]);
      const roles = await asTenant(A, () => repos!.dashboard.rolesNeedingAttention(A));
      expect(roles).toHaveLength(1);
      expect(roles[0]!.id).toBe(jobA);
      // Passing another tenant's id to these can't reveal its numbers either.
      expect(await asTenant(A, () => repos!.dashboard.skillGaps(B))).toEqual([]);
    });

    it("update runs in a transaction that carries the tenant, and can't reach other tenants", async () => {
      const updated = await asTenant(A, () => repos!.candidate.update(candA[0]!, { fullName: "renamed", skillIds: [skillId] }));
      expect(updated.fullName).toBe("renamed");
      await expect(asTenant(A, () => repos!.candidate.update(candB[0]!, { fullName: "hijacked", skillIds: [skillId] }))).rejects.toThrow();
    });

    it("tenantTransaction sees only its tenant", async () => {
      const seen = await asTenant(B, () => tenantTransaction((tx) => tx.candidate.findMany()));
      expect(seen.every((c) => c.tenantId === B)).toBe(true);
      expect(seen.length).toBeGreaterThan(0);
    });
  });

  describe("audit log", () => {
    it("a row with no tenant can be written but is never readable by a tenant", async () => {
      await repos!.audit.create({ action: `${RUN} signed in` }); // no tenant, like a login
      const seenByA = await asTenant(A, () => repos!.audit.findMany(A, { page: 1, pageSize: 50 }));
      expect(seenByA.items.every((row) => row.tenantId === A)).toBe(true);
      expect(seenByA.items.some((row) => row.action.includes("signed in"))).toBe(false);
    });

    it("a tenant's entries are visible to that tenant only", async () => {
      await repos!.audit.create({ tenantId: A, action: `${RUN} A did something` });
      const seenByB = await asTenant(B, () => repos!.audit.findMany(B, { page: 1, pageSize: 50 }));
      expect(seenByB.items.some((row) => row.action.includes("A did something"))).toBe(false);
      const seenByA = await asTenant(A, () => repos!.audit.findMany(A, { page: 1, pageSize: 50 }));
      expect(seenByA.items.some((row) => row.action.includes("A did something"))).toBe(true);
    });
  });

  describe("what is deliberately NOT protected keeps working with no tenant", () => {
    it("tenants, users and skills are reachable before a tenant is chosen (login needs this)", async () => {
      expect((await prisma.tenant.findMany({ where: { name: { startsWith: RUN } } })).length).toBeGreaterThanOrEqual(2);
      expect((await prisma.skill.findMany({ where: { name: `${RUN}-skill` } })).length).toBe(1);
      await expect(prisma.user.count()).resolves.toBeTypeOf("number");
      await expect(prisma.membership.count()).resolves.toBeTypeOf("number");
    });
  });

  describe("concurrency", () => {
    it("tenant context never leaks between overlapping requests", async () => {
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) => {
          const tenant = i % 2 === 0 ? A : B;
          return asTenant(tenant, async () => ({ tenant, rows: await prisma.candidate.findMany() }));
        })
      );
      for (const { tenant, rows } of results) {
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((r) => r.tenantId === tenant)).toBe(true);
      }
    });
  });
});
