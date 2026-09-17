---
name: full-stack-standards
description: Coding standards checklist for this project's React/TypeScript + Express/TypeScript + Prisma/PostgreSQL stack. Load before writing or reviewing backend routes/controllers/services/repositories, Prisma schema changes, or React components/Redux slices in this repo.
---

# Full-Stack Coding Standards — Talent Finder Recruiter Portal

Apply these when writing or reviewing code in this repo. See `CLAUDE.md` for architecture/layering
and multi-tenancy rules first — this skill covers line-level conventions.

## Backend (Express + TypeScript + Prisma)

- **Layering is non-negotiable**: Route → Controller → Service → Repository. A repository is the
  only file allowed to import `PrismaClient` / call `prisma.*`. A controller never contains a
  `where` clause. A service never sees `req`/`res`.
- **One repository per entity** (`candidate.repository.ts`, `jobOrder.repository.ts`, ...). Methods
  return domain objects/Prisma types, not raw rows shaped for the HTTP response.
- **Validation at the boundary**: every controller validates `req.body`/`req.query`/`req.params`
  with a `zod` schema before calling the service. Return 400 with the zod error on failure — don't
  let bad input reach a service or Prisma.
- **Tenant scoping is enforced server-side, always** — a service method for a tenant-scoped entity
  takes `tenantId` as an explicit parameter (not inferred from the record it's about to touch) and
  the repository query filters on it. Never trust a client-supplied record ID alone to imply the
  right tenant — refetch/verify tenant ownership in the service.
- **Errors**: throw typed errors (`NotFoundError`, `ValidationError`, etc.) from services; one
  central Express error-handling middleware maps them to status codes. No `try/catch` +
  `res.status(500)` scattered across controllers.
- **Async**: every route handler wrapped so rejected promises reach the error middleware (e.g. a
  thin `asyncHandler` wrapper) — don't rely on unhandled-rejection crashes.
- **No business logic in routes files** — a route file is a list of
  `router.get('/:id', controller.getOne)` lines and nothing else.
- **Prisma schema**: explicit relation names for any model with more than one relation to the same
  table; `onDelete` behavior chosen deliberately (cascade for join tables, restrict/set null for
  things a user shouldn't silently lose), not left at the Prisma default without thought.
- **Migrations**: use `prisma migrate dev` during development so migration history stays in the
  repo — never hand-edit the generated SQL unless fixing a genuine migration bug.

## Frontend (React + TypeScript + Redux Toolkit + Tailwind)

- **Data fetching via RTK Query**, not ad-hoc `useEffect` + `fetch`/`axios`. One API slice per
  entity (`candidatesApi`, `jobOrdersApi`, ...) with typed request/response shapes shared from a
  common `types/` module (mirror the backend DTOs, don't redefine them loosely per-component).
  Ensure the tenant scope value flows into query args / headers automatically for every tenant-scoped
  endpoint (e.g. by baking the header injection into the RTK Query `baseQuery`, not
  per-call) — don't rely on every component remembering to pass it.
- **Redux slices** hold only UI/app state that isn't server data (selected tenant, filters, modal
  open/closed). Don't duplicate server data into a plain slice when RTK Query already caches it.
- **Component structure**: `pages/` (route-level, own the data fetching + layout), `components/`
  (presentational, receive data via props, no direct API calls). A page composes components; a
  component doesn't reach into the store for data its parent already has.
- **Every list page** (Candidate/JobOrder/Submission) reuses one shared layout: header row (title +
  tenant dropdown + primary action), summary cards, search+sort toolbar, table with row action menu,
  footer with count+pagination — build this once as a shared layout component, don't hand-roll it
  per page.
- **Forms**: one validation source of truth — reuse the same zod schema shape as the backend where
  practical (define once in a shared `types`/`schemas` location if the monorepo setup allows, or keep
  them obviously mirrored with a comment noting where the backend counterpart lives).
- **Tailwind**: no inline arbitrary magic-number colors scattered across components — define the
  palette once (Tailwind theme config) and reference tokens, so light/dark or rebranding is a
  one-file change.
- **Accessibility basics**: every icon-only button (action menu ⋮, delete icon, etc.) gets an
  `aria-label`; forms use `<label htmlFor>` tied to inputs, not placeholder-as-label.
- **Loading/empty/error states** are handled explicitly on every list/detail page (RTK Query gives
  you `isLoading`/`isError`/`data` — use all three, don't just render `data` and hope).

## Cross-Cutting

- No `any`/`unknown`-without-narrowing crossing a function boundary you own. If a third-party type
  is genuinely loose, narrow it at the edge and pass a typed value inward.
- Don't add abstractions (generic CRUD factory, plugin system, etc.) ahead of a second concrete use
  case — four entities with the same shape is still better written four times than behind a clever
  generic, per `CLAUDE.md`'s no-premature-abstraction rule.
- Comments explain *why* (a non-obvious tenant-isolation edge case, a workaround), never *what* —
  identifiers should make the *what* obvious.
