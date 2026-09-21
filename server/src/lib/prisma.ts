import { Prisma, PrismaClient } from "@prisma/client";
import { currentScope, runInTransaction } from "./tenantScope";

/**
 * The single Prisma client, with Postgres row-level security wired in.
 *
 * Every query on a tenant-owned table runs inside a tiny transaction that
 * first tells Postgres which tenant it is for (`app.current_tenant`) and drops
 * to a non-superuser role. The database then refuses rows from any other
 * tenant, *whatever the query says*: a missing `where tenantId` can no longer
 * leak data. With no tenant set, the answer is "no rows" (fail closed).
 * See prisma/migrations/*_row_level_security and docs/row-level-security.md.
 */
const base = new PrismaClient();

// Tables the migration protects. Identity tables (tenants, users, memberships)
// and the shared skills list are deliberately not in it.
const RLS_MODELS = new Set(["Candidate", "JobOrder", "Submission", "AuditLog", "CandidateSkill", "JobOrderRequiredSkill"]);
const RLS_TABLES = ["candidates", "job_orders", "submissions", "audit_logs", "candidate_skills", "job_order_required_skills"];
const DEFAULT_ROLE = "talentfinder_app";

// The role to SET ROLE to, decided once at startup by initRls(). Null when it
// doesn't exist or the connection can't use it; FORCE ROW LEVEL SECURITY then
// still binds the table owner (see the migration).
let appRole: string | null = null;

function contextSql(tenantId: string | null): Prisma.Sql {
  return appRole
    ? Prisma.sql`SELECT set_config('app.current_tenant', ${tenantId ?? ""}, true), set_config('role', ${appRole}, true)`
    : Prisma.sql`SELECT set_config('app.current_tenant', ${tenantId ?? ""}, true)`;
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, args, query }) {
        const scope = currentScope();
        // Inside tenantTransaction() the context is already set on that connection.
        if (!RLS_MODELS.has(model) || scope?.inTransaction) return query(args);
        // `true` = local to this transaction, so it can't leak to the next request on the pooled connection.
        const [, result] = await base.$transaction([base.$executeRaw(contextSql(scope?.tenantId ?? null)), query(args)]);
        return result;
      },
    },
  },
});

/**
 * An interactive transaction that carries the tenant context. Use this instead
 * of prisma.$transaction (which would run without it and on another connection).
 */
export function tenantTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const tenantId = currentScope()?.tenantId ?? null;
  return base.$transaction(async (tx) => {
    await tx.$executeRaw(contextSql(tenantId));
    return runInTransaction(() => fn(tx));
  });
}

/** Raw SQL with the same tenant context. Use this instead of prisma.$queryRaw. */
export async function scopedQueryRaw<T>(sql: Prisma.Sql): Promise<T> {
  const tenantId = currentScope()?.tenantId ?? null;
  const [, rows] = await base.$transaction([base.$executeRaw(contextSql(tenantId)), base.$queryRaw<T>(sql)]);
  return rows as T;
}

export interface RlsStatus {
  /** True only if Postgres will really refuse cross-tenant access for this connection. */
  enforced: boolean;
  /** The database role queries effectively run as. */
  role: string;
  usingAppRole: boolean;
  problems: string[];
}

/**
 * Called once at startup. Picks the app role if the connection can use it, then
 * checks the *effective* role and the policies, because RLS silently does
 * nothing for a superuser or BYPASSRLS role, and that is worth shouting about.
 */
export async function initRls(env: NodeJS.ProcessEnv = process.env): Promise<RlsStatus> {
  const wanted = env.RLS_DB_ROLE ?? DEFAULT_ROLE;
  const usable = await base.$queryRaw<{ usable: boolean }[]>`
    SELECT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${wanted}::name)
            AND pg_has_role(current_user, ${wanted}::name, 'member')) AS usable`;
  appRole = usable[0]?.usable ? wanted : null;

  const [, effective, protectedTables] = await base.$transaction([
    base.$executeRaw(contextSql(null)),
    base.$queryRaw<{ name: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      SELECT current_user::text AS name, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user`,
    base.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN (${Prisma.join(RLS_TABLES)})
        AND c.relrowsecurity AND c.relforcerowsecurity`,
  ]);

  const problems: string[] = [];
  const role = effective[0];
  if (!role || role.rolsuper || role.rolbypassrls) {
    problems.push(
      `queries run as "${role?.name ?? "unknown"}", which bypasses row-level security (superuser/BYPASSRLS) and the "${wanted}" role is not usable`
    );
  }
  const missing = RLS_TABLES.filter((t) => !protectedTables.some((p) => p.relname === t));
  if (missing.length > 0) problems.push(`row-level security is not enabled and forced on: ${missing.join(", ")} (run the migrations)`);

  return { enforced: problems.length === 0, role: role?.name ?? "unknown", usingAppRole: appRole !== null, problems };
}
