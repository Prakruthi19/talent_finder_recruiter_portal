-- Row-Level Security: a second lock underneath the application's own
-- `WHERE tenantId = ...` filters. Even if a query forgets the filter, the
-- database itself refuses to show or change another tenant's rows.
-- Hand-written on purpose: Prisma cannot express RLS. See docs/row-level-security.md
-- (including how to roll this back).

-- 1. Which tenant is this database session working for? The application sets
--    `app.current_tenant` for every query (server/src/lib/prisma.ts). NULLIF makes
--    "unset" and "empty" both NULL, and NULL matches no row: the default is DENY.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid $$;

-- 2. A role the application drops to for each query (SET ROLE). Superusers and
--    BYPASSRLS roles skip RLS completely, even with FORCE, so a superuser
--    connection (e.g. the local Docker database) enforces nothing unless its
--    queries run as an ordinary role like this one.
--    Hosts that don't allow CREATE ROLE (or a managed database's restricted user)
--    are handled: role creation is skipped and FORCE (below) covers the table owner.
DO $$
BEGIN
  CREATE ROLE talentfinder_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not create role talentfinder_app (no CREATEROLE); relying on FORCE ROW LEVEL SECURITY for the table owner.';
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'talentfinder_app') THEN
    -- Lets the connection role SET ROLE to it.
    GRANT talentfinder_app TO CURRENT_USER;
    GRANT USAGE ON SCHEMA public TO talentfinder_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO talentfinder_app;
    -- The migration history is none of the application's business.
    REVOKE ALL ON TABLE _prisma_migrations FROM talentfinder_app;
    -- Tables created by future migrations get the same rights.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO talentfinder_app;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not grant privileges to talentfinder_app; relying on FORCE ROW LEVEL SECURITY for the table owner.';
END
$$;

-- 3. Tables that carry a tenantId. FORCE applies the policies to the table owner
--    too (the role migrations and, on a managed host, the app itself connect as).
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidates
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant());

ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_orders
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant());

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON submissions
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant());

-- The audit log's tenantId is nullable (logins and tenant creation belong to no
-- tenant). Those rows may be WRITTEN by anyone but are never READ back by a tenant.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_logs
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" IS NULL OR "tenantId" = app_current_tenant());

-- 4. Link tables have no tenantId of their own; they belong to whichever tenant
--    owns the row they point at. The EXISTS subquery is itself subject to the
--    policies above, so "can see the candidate" is exactly "can see its skills".
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidate_skills
  USING (EXISTS (SELECT 1 FROM candidates c WHERE c.id = candidate_skills."candidateId"))
  WITH CHECK (EXISTS (SELECT 1 FROM candidates c WHERE c.id = candidate_skills."candidateId"));

ALTER TABLE job_order_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_required_skills FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON job_order_required_skills
  USING (EXISTS (SELECT 1 FROM job_orders j WHERE j.id = job_order_required_skills."jobOrderId"))
  WITH CHECK (EXISTS (SELECT 1 FROM job_orders j WHERE j.id = job_order_required_skills."jobOrderId"));

-- Deliberately NOT protected: tenants, users, memberships (they decide who may
-- act for which tenant, before any tenant is chosen) and skills (shared by all).
