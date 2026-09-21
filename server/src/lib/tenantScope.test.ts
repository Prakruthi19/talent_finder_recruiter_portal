import { describe, expect, it } from "vitest";
import { currentScope, runInTransaction, runWithTenant } from "./tenantScope";

describe("tenantScope", () => {
  it("carries the tenant through awaits, and clears it outside the scope", async () => {
    expect(currentScope()).toBeUndefined();
    const seen = await runWithTenant("tenant-a", async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 5));
      return currentScope()?.tenantId;
    });
    expect(seen).toBe("tenant-a");
    expect(currentScope()).toBeUndefined();
  });

  it("starts a lazy promise (like Prisma's) INSIDE the scope, even if the caller awaits it later", async () => {
    // Prisma queries only run when first awaited. This one records the tenant at that moment.
    let tenantWhenStarted: string | null | undefined = "never-started";
    const lazy = {
      then(resolve: (v: string) => void) {
        tenantWhenStarted = currentScope()?.tenantId;
        resolve("done");
      },
    } as PromiseLike<string>;

    const returned = runWithTenant("tenant-a", () => lazy);
    // Let queued microtasks run WITHOUT awaiting `returned` ourselves. Had runWithTenant not
    // started it, `then` would still not have been called (nothing else awaits it).
    await Promise.resolve();
    await Promise.resolve();
    expect(tenantWhenStarted).toBe("tenant-a");
    await expect(returned).resolves.toBe("done");
  });

  it("keeps overlapping requests separate", async () => {
    const results = await Promise.all(
      ["a", "b", "c", "d"].map((tenant, i) =>
        runWithTenant(tenant, async () => {
          await new Promise((r) => setTimeout(r, (4 - i) * 3));
          return currentScope()?.tenantId;
        })
      )
    );
    expect(results).toEqual(["a", "b", "c", "d"]);
  });

  it("null means 'no tenant', and transactions keep the tenant but are marked", async () => {
    expect(await runWithTenant(null, async () => currentScope())).toEqual({ tenantId: null, inTransaction: false });
    const inTx = await runWithTenant("t", () => runInTransaction(() => currentScope()));
    expect(inTx).toEqual({ tenantId: "t", inTransaction: true });
  });
});
