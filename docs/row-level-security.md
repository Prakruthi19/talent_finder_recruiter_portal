# Row-level security (RLS)

Tenant isolation has two locks:

1. **The application** filters every query by `tenantId` (repositories, plus the membership check in
   `middleware/tenantContext.ts`).
2. **The database** refuses another tenant's rows *even if a query forgets that filter* (this document).

If someone writes `prisma.candidate.findMany()` with no `where`, the first lock is gone. The second
still holds: it returns only the current tenant's candidates.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Policies | `prisma/migrations/*_row_level_security` | `candidates`, `job_orders`, `submissions`, `audit_logs` are visible/changeable only when `tenantId = app_current_tenant()`. The two link tables (`candidate_skills`, `job_order_required_skills`) follow the row they point at. |
| Tenant per request | `middleware/tenantContext.ts` -> `lib/tenantScope.ts` | After the membership check, the tenant is carried through the whole request with `AsyncLocalStorage`. |
| Telling Postgres | `lib/prisma.ts` | Every query on a protected table runs in a tiny transaction that first does `set_config('app.current_tenant', <id>, true)` (and drops to the app role). `true` = local to that transaction, so it can't leak to the next request on a pooled connection. |
| Default = deny | the migration's `app_current_tenant()` | No tenant set -> `NULL` -> matches no row. |

**Deliberately not protected:** `tenants`, `users`, `memberships` (they decide who may act for which
tenant, *before* a tenant is chosen: login needs them) and `skills` (shared by everyone).

## The superuser trap (why there are two modes)

Postgres **superusers and `BYPASSRLS` roles skip RLS completely, even with `FORCE`.** The local Docker
user (`talentfinder`) is a superuser, so a naive RLS migration would enforce nothing there. So:

* **App-role mode** (local Docker): each query runs `SET ROLE talentfinder_app`, an ordinary,
  non-superuser role created by the migration. Used automatically when the connection can `SET ROLE` to it.
* **FORCE mode** (a managed host such as Render, where the login user is the table owner and not a
  superuser): the migration uses `FORCE ROW LEVEL SECURITY`, which binds the table owner too. If the
  host won't let the migration create the role, it is skipped with a notice and this mode applies.

At startup the API prints which mode it is in, or shouts if RLS is **not** enforced:

```
Row-level security: enforced (queries run as "talentfinder_app", via the app role)
Row-level security: enforced (queries run as "render_like", the table owner, FORCE mode)
Row-level security: NOT enforced. queries run as "talentfinder", which bypasses row-level security ...
```

Set `RLS_REQUIRED=true` to make "not enforced" fatal. Recommended for production **once you have seen
the "enforced" line on that host** (setting it blind could stop the API from starting).

## Rules for writing code

* Raw SQL: `scopedQueryRaw(Prisma.sql\`...\`)`, never `prisma.$queryRaw`.
* Interactive transactions: `tenantTransaction(async (tx) => ...)`, never `prisma.$transaction(async ...)`
  (it would run on another connection, without the tenant, and can deadlock against the outer one).
* Prisma queries are **lazy** (they run when first awaited). `runWithTenant` starts a returned query
  inside the scope for you; don't work around that.
* A new tenant-owned table needs: a policy in a new migration, plus an entry in `RLS_MODELS` and
  `RLS_TABLES` in `lib/prisma.ts` (the startup check will report the table as unprotected otherwise).
* Scripts and seeds that touch protected tables run as the table owner, so they must state their tenant
  (see `prisma/seed.ts`), or use `TRUNCATE`, which RLS does not filter.
* An audit row with no tenant (a login) can be written but never read back by a tenant. Write it with
  `createMany` (a plain INSERT): `RETURNING` counts as a read and would be refused.
* A future migration that reads or updates rows in these tables must set `app.current_tenant` itself.

## Proving it works

`npm run test:rls` attacks a **real** Postgres with queries that have no tenant filter at all (24 tests:
reads, writes, inserts into another tenant, `deleteMany()` with no `where`, link tables, raw SQL, the
real repositories, the audit log, and 40 overlapping requests). It refuses any database whose name doesn't
start with `rls_`, and refuses to pass if RLS isn't actually enforced (so a superuser trap fails loudly).

Create scratch databases and run it (against the local Docker Postgres):

```bash
# 1. a superuser-style database (exercises app-role mode)
docker exec talent-finder-db psql -U talentfinder -d postgres -c "CREATE DATABASE rls_local;"
DATABASE_URL="postgresql://talentfinder:talentfinder@localhost:55432/rls_local?schema=public" npx prisma migrate deploy
RLS_TEST_DATABASE_URL="postgresql://talentfinder:talentfinder@localhost:55432/rls_local?schema=public" \
  RLS_TEST_EXPECT_APP_ROLE=true npm run test:rls

# 2. a Render-style database: a plain owner with no CREATEROLE (exercises FORCE mode)
docker exec talent-finder-db psql -U talentfinder -d postgres \
  -c "CREATE ROLE render_like LOGIN PASSWORD 'render_like' NOSUPERUSER NOCREATEDB NOCREATEROLE;" \
  -c "CREATE DATABASE rls_render_sim OWNER render_like;"
DATABASE_URL="postgresql://render_like:render_like@localhost:55432/rls_render_sim?schema=public" npx prisma migrate deploy
RLS_TEST_DATABASE_URL="postgresql://render_like:render_like@localhost:55432/rls_render_sim?schema=public" \
  RLS_TEST_EXPECT_APP_ROLE=false npm run test:rls
```

The normal `npm test` needs no database and does not run these.

## Cost

Each query on a protected table becomes a small transaction (`BEGIN`, `set_config`, the query,
`COMMIT`): a few extra round trips. Negligible at this app's size; measure before scaling far past it.

## Rolling back

```sql
ALTER TABLE candidates, job_orders, submissions, audit_logs, candidate_skills, job_order_required_skills
  NO FORCE ROW LEVEL SECURITY, DISABLE ROW LEVEL SECURITY;
-- optional: DROP POLICY tenant_isolation ON <each table>; DROP FUNCTION app_current_tenant();
```

The application code keeps working with RLS off (it still filters by `tenantId`, and the extra
`set_config` is harmless).

## Known limits

* Not yet run on the real Render database. The FORCE path was proven on a Postgres role set up to look
  like Render's, but check the startup line after the first deploy.
* RLS is a backstop against *forgotten filters*, not against a compromised application role that can
  itself `SET app.current_tenant` to anything. The tenant id we set always comes from the verified membership.
