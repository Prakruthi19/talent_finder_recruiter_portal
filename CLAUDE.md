# Talent Finder — Recruiter Portal

Multi-tenant recruitment portal. A recruiter manages Candidates and Job Orders within a Tenant;
the core feature is skill-based matching (rank candidates against a Job Order's required skills)
and one-click Shortlist → Submission tracking.

Full requirements: `TalentFinder-Recruiter-Portal-Assignment.pdf` (read it before changing scope).

## Tech Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, Redux Toolkit (RTK Query for API calls)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Docker Compose (`docker-compose.yml` at repo root)
- **ORM**: Prisma (schema at `server/prisma/schema.prisma`)

## Repo Layout

```
client/     React app (Vite)
server/     Express API
  prisma/   schema.prisma, migrations, seed.ts
  src/
    routes/         Express routers — thin, just wire path -> controller
    controllers/     parse req, call service, shape res. No business logic, no Prisma calls.
    services/        business logic (matching algorithm, tenant scoping rules, validation)
    repositories/    only place that imports the Prisma client / runs queries
    middleware/       error handler, tenant context, upload handling
    lib/              prisma client singleton, shared helpers
```

**Layering rule**: Routes → Controllers → Services → Repositories. A controller never calls Prisma
directly; a service never touches `req`/`res`. Keep this strict even when it feels like overkill for
a one-line CRUD op — the assignment is graded on this separation.

## Multi-Tenancy

- Every tenant-scoped table (`Candidate`, `JobOrder`, `Submission`) has a `tenantId` FK.
- Every repository query for these tables **must** filter by `tenantId`. There is no shared/global
  view across tenants anywhere in the app. That is the *first* lock; row-level security is the second.
- **Row-level security (Postgres RLS) is the second lock.** The database itself refuses another
  tenant's rows even if a query forgets its `where tenantId` (migration `*_row_level_security`,
  `server/src/lib/prisma.ts`, full notes in `docs/row-level-security.md`). Rules that keep it working:
  raw SQL goes through `scopedQueryRaw`, interactive transactions through `tenantTransaction` (never
  `prisma.$queryRaw` / `prisma.$transaction`); a new tenant-owned table needs a policy in a migration
  *and* an entry in `RLS_MODELS`/`RLS_TABLES`; `npm run test:rls` proves it against a real database.
  The local Docker database user is a superuser, which bypasses RLS: the app avoids that by running
  each query as the `talentfinder_app` role, and logs "Row-level security: enforced" at startup.
- The frontend keeps the selected tenant in Redux (persisted to `localStorage`) and sends it on every
  request as an `X-Tenant-Id` header (`client/src/api/baseApi.ts`'s `prepareHeaders`), read server-side
  by `server/src/middleware/tenantContext.ts`. The header is only a *request*: it is honoured only if
  the signed-in user is a member of that tenant (403 otherwise), and the tenant is then carried through
  the request with `AsyncLocalStorage` (`lib/tenantScope.ts`) so the database can enforce it.
- **RTK Query gotcha**: the cache key for a query is derived only from its arguments, never from
  headers. Every tenant-scoped list/summary query must include `tenantId` in its own arguments (see
  `CandidateListParams`, `JobOrderListParams`, `SubmissionListParams` and their `*Summary` siblings) —
  otherwise switching tenants while page/search/sort stay at their defaults silently serves the
  previous tenant's cached data. Found and fixed once already; don't reintroduce it on a new endpoint.

## Skill Matching

- Skills are normalized entities (`Skill` table) with join tables `CandidateSkill` and
  `JobOrderRequiredSkill` — not comma-separated strings.
- Match = exact, case-insensitive name intersection between a candidate's skills and a job order's
  required skills. Rank by match count, descending. Zero-match candidates are excluded, not shown
  as "0 matches".
- Fuzzy matching (fuse.js) is used, but *only* for detecting known skills inside free-text CV content
  during auto-fill (`server/src/lib/cvFieldExtractor.ts`) — never in this core matching query. Don't
  loosen this to fuzzy matching without being asked; the spec calls for exact keyword matching here.

## Conventions

- TypeScript strict mode everywhere. No `any` unless justified with a comment.
- Validate all request bodies with `zod` at the controller boundary before they reach a service.
- Auth: email + password login issues an HS256 JWT (`middleware/auth.ts`, `lib/jwt.ts`); users belong
  to tenants through `Membership` rows with a role (ADMIN/RECRUITER); optional invite-only Google
  sign-in. The spec has no login story, so this was added at the user's request as a security layer.
  Real accounts come from `npm run create-user` (or `BOOTSTRAP_ADMIN_*` on a host with no shell).
- CV files are stored on local disk under `server/uploads/`, path referenced from `Candidate.cvPath`.
- CV auto-fill (bonus, implemented): `POST /api/candidates/parse-cv` (multipart, parse-only — nothing
  persisted) extracts text via `pdf-parse`/`mammoth` and detects fields via regex + `compromise` NLP +
  fuzzy skill matching (`server/src/lib/cvFieldExtractor.ts`, `cvParsing.service.ts`). Returns
  `{ readable: false }` for near-empty extracted text (scanned/corrupt CV) rather than guessing — the
  frontend falls back to manual entry, and every auto-filled field stays editable before save, per
  spec. Real file bytes are verified against the claimed type (`lib/fileTypeCheck.ts`, via `file-type`)
  on both this endpoint and the actual create-candidate upload — never trust a client-sent Content-Type
  alone.
- AI feature (bonus): `POST /api/job-orders/:id/insight { candidateId }` generates a short natural-
  language fit assessment via `server/src/lib/aiProvider.ts` (any OpenAI-compatible chat completions
  endpoint — OpenAI by default, model configurable via `AI_MODEL`). Purely additive — the actual skill-match ranking never
  depends on it. Returns 503 with a clear message if `AI_API_KEY` isn't set; don't make any other
  feature depend on the AI provider being configured.

## Running Locally

```
docker compose up -d          # Postgres
cd server && npm run dev      # API
cd client && npm run dev      # frontend
```

Seed data must produce enough tenants/candidates/job orders that skill-match ranking is visibly
meaningful on first run (spec requirement — don't skip this).

## Deployment

Render Blueprint at `render.yaml` (repo root) — see `DEPLOY.md` for click-by-click steps. Three
resources: `talent-finder-api` (Express), `talent-finder-client` (static Vite build),
`talent-finder-db` (managed Postgres). `AI_API_KEY` is deliberately excluded from the blueprint
(`sync: false`) — set it in the Render dashboard, never commit it. Seeding is manual-only in
production (`prisma/seed.ts` is destructive — wipes every table before reseeding) — do not wire it
into a startCommand or any auto-run path.

## Tests

`npm test` in `server/` or `client/` runs Vitest (`npm run test:watch` for watch mode). Backend
tests target the **service layer** with repositories mocked via `vi.mock` — that's where the
business logic worth testing actually lives, per the layering rule above; controllers/routes are
thin enough not to need their own tests. Frontend tests cover pure utility functions only
(`lib/format.ts`, `lib/skillColor.ts`, `api/queryParams.ts`) — no component/RTL tests yet.

## Assumptions (for interview discussion)

The spec explicitly invites documented assumptions for gaps/ambiguities. Consolidated list:

- **Login was added beyond the spec** — the spec has no login user story. Without it the tenant
  header could simply be forged, so sign-in, tenant memberships and roles were added (see Conventions).
- **Tenant = sourcing channel** (LinkedIn/Monster/Naukri), not a company name — matches the spec's own
  example (`Tenant Name * (required, e.g. LinkedIn)`) and the entity diagram. Distinct from Job Order's
  `Client Name`, which is the actual hiring company *within* a tenant.
- **Candidate.fullName and JobOrder.title are required**, even though the spec's own asterisk
  placement only marks *other* fields required on those two forms (2.2 asterisks Total Experience and
  Skills only; 3.2 asterisks Location, Min Experience, Number of Openings and Required Skills only). A
  nameless candidate or titleless job order isn't a usable record, so both are validated as required
  server-side (`createCandidateSchema`, `createJobOrderSchema`).
- **Multi-tenancy is shared-schema, not siloed** — one Postgres schema, every tenant-scoped table has a
  `tenantId` FK, every repository query filters by it. No per-tenant schema/database.
- **CV-unreadable threshold** is a heuristic: less than 40 characters of extracted text counts as
  "nearly empty" per the appendix's guidance — not a number the spec itself specifies.
- **Responsive layout uses Tailwind's responsive utilities throughout** (sidebar collapses, grids
  reflow) but hasn't been manually verified pixel-by-pixel on a real narrow viewport in this session —
  no browser automation tool was available to click through it. Worth a manual pass before treating it
  as fully confirmed.

## Performance Notes

- The skill-matching query (`jobOrder.repository.findMatchCounts`) is a raw SQL join, not an
  app-code loop — see the comment there before "optimizing" it back into JS.
- `CandidateSkill.skillId` and `JobOrderRequiredSkill.skillId` have explicit indexes beyond their
  composite PKs, because the matching join filters on `skillId`, which the PK (`[candidateId,
  skillId]` / `[jobOrderId, skillId]`) doesn't serve efficiently on its own.
- `Submission.jobOrderId` has its own index for the same reason (Job Order Details page's
  `findByJobOrder` filters on it directly).
- If search (`contains`/ILIKE) needs to scale beyond the seed-data size, add a `pg_trgm` GIN index
  rather than more B-tree indexes — not done yet since it needs a Postgres extension and isn't
  justified at this data volume.
