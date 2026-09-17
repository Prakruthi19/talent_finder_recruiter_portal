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
  view across tenants anywhere in the app.
- The frontend keeps the selected tenant in Redux (persisted to `localStorage`) and sends it as
  `X-Tenant-Id` header (or query param, whichever we land on) — check `server/src/middleware` for
  the current convention before adding a new endpoint.

## Skill Matching

- Skills are normalized entities (`Skill` table) with join tables `CandidateSkill` and
  `JobOrderRequiredSkill` — not comma-separated strings.
- Match = exact, case-insensitive name intersection between a candidate's skills and a job order's
  required skills. Rank by match count, descending. Zero-match candidates are excluded, not shown
  as "0 matches".
- Fuzzy matching (fuse.js etc.) is optional/bonus — don't add it unless asked.

## Conventions

- TypeScript strict mode everywhere. No `any` unless justified with a comment.
- Validate all request bodies with `zod` at the controller boundary before they reach a service.
- No auth/login in this build (assumption — the spec has no login user story). Don't add JWT/session
  scaffolding unless the user asks for it.
- CV files are stored on local disk under `server/uploads/`, path referenced from `Candidate.cvPath`.
  CV text-parsing (auto-fill) is optional/bonus per the spec — a working manual form is equally
  acceptable and should not block the core deliverables.
- Don't reach for AI features unless asked — they're explicitly "not mandatory" in the spec.

## Running Locally

```
docker compose up -d          # Postgres
cd server && npm run dev      # API
cd client && npm run dev      # frontend
```

Seed data must produce enough tenants/candidates/job orders that skill-match ranking is visibly
meaningful on first run (spec requirement — don't skip this).
