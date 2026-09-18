# Talent Finder — Recruiter Portal

Multi-tenant recruitment portal. A recruiter manages Candidates and Job Orders within a Tenant;
the core feature is skill-based matching (rank candidates against a Job Order's required skills)
and one-click Shortlist → Submission tracking.

**Live demo:** https://talent-finder-client.onrender.com
*(free tier — first load after inactivity can take 30-50s to wake up)*

## Tech Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, Redux Toolkit (RTK Query)
- **Backend**: Node.js + Express + TypeScript, layered Routes → Controllers → Services → Repositories
- **Database**: PostgreSQL + Prisma ORM
- **Bonus features**: CV auto-fill (multer, pdf-parse/mammoth, compromise, fuse.js), AI match insight (OpenAI-compatible)

## Run Locally

```
docker compose up -d          # Postgres
cd server && npm install && npm run prisma:migrate && npm run seed && npm run dev   # API on :4000
cd client && npm install && npm run dev                                             # frontend on :5173
```

## Tests

```
cd server && npm test   # 48 tests, service layer
cd client && npm test   # utility functions
```

## Deploying

See [`DEPLOY.md`](./DEPLOY.md) — one Render Blueprint (`render.yaml`) provisions the API, the
static frontend, and managed Postgres together.

## More detail

- [`CLAUDE.md`](./CLAUDE.md) — architecture rules, multi-tenancy enforcement, skill-matching
  algorithm, documented assumptions
- `TalentFinder-Recruiter-Portal-Assignment.pdf` — original spec
