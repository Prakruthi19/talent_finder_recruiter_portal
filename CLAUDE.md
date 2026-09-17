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
- AI feature (bonus): `POST /api/job-orders/:id/insight { candidateId }` generates a short natural-
  language fit assessment via `server/src/lib/aiProvider.ts` (any OpenAI-compatible chat completions
  endpoint — Groq free tier by default). Purely additive — the actual skill-match ranking never
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

## Tests

`npm test` in `server/` or `client/` runs Vitest (`npm run test:watch` for watch mode). Backend
tests target the **service layer** with repositories mocked via `vi.mock` — that's where the
business logic worth testing actually lives, per the layering rule above; controllers/routes are
thin enough not to need their own tests. Frontend tests cover pure utility functions only
(`lib/format.ts`, `lib/skillColor.ts`, `api/queryParams.ts`) — no component/RTL tests yet.

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
