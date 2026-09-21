import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which tenant the current request is working for, carried through every
 * `await` of that request without passing it around (AsyncLocalStorage).
 * lib/prisma.ts reads it and tells Postgres, so the database's row-level
 * security can enforce it. Kept free of any database import on purpose.
 */
interface Scope {
  tenantId: string | null;
  /** True inside an interactive transaction, where the context is already set. */
  inTransaction: boolean;
}

const storage = new AsyncLocalStorage<Scope>();

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

/**
 * Runs `fn` (and everything it awaits) as tenant `tenantId`. `null` = no tenant (sees no tenant data).
 *
 * Prisma queries are LAZY: `prisma.x.findMany()` does nothing until it is first
 * awaited. If such a promise were returned out of this scope and awaited later,
 * it would run with no tenant. So a returned thenable is started here, inside
 * the scope, which makes that mistake impossible.
 */
export function runWithTenant<T>(tenantId: string | null, fn: () => T): T {
  return storage.run({ tenantId, inTransaction: false }, () => {
    const result = fn();
    return isThenable(result) ? (Promise.resolve(result) as T) : result;
  });
}

export const currentScope = (): Scope | undefined => storage.getStore();

export function runInTransaction<T>(fn: () => T): T {
  return storage.run({ tenantId: storage.getStore()?.tenantId ?? null, inTransaction: true }, fn);
}
