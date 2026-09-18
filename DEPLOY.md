# Deploying to Render

This repo ships a `render.yaml` Blueprint that defines all three pieces in
one file: the Express API (`talent-finder-api`), the React static site
(`talent-finder-client`), and a managed Postgres instance
(`talent-finder-db`).

## 1. Push to GitHub

Render deploys from a connected GitHub repo. Push this branch (including
`render.yaml`) before continuing.

## 2. Create the Blueprint

1. [render.com](https://render.com) → **New** → **Blueprint**.
2. Connect the `talent_finder_recruiter_portal` repo.
3. Render reads `render.yaml` and shows the three resources it's about to
   create. Click **Apply**.
4. First deploy takes a few minutes — the API's `buildCommand` runs
   `prisma generate` + `tsc`, and its `startCommand` runs
   `prisma migrate deploy` before starting the server, so your schema is
   applied automatically.

## 3. Set the AI API key (optional)

`AI_API_KEY` is intentionally left blank in `render.yaml` (`sync: false`)
so it's never committed. To enable the "Generate AI Insight" bonus feature:

- Render dashboard → `talent-finder-api` → **Environment** → add
  `AI_API_KEY` with your OpenAI key.
- Everything else works identically without it — that one endpoint just
  returns a 503 with a clear "not configured" message.

## 4. Seed the database — once, manually

`server/prisma/seed.ts` calls `deleteMany()` on every table before
recreating data. That's fine for local dev, but it must **never** run
automatically on every deploy/restart in production — it would wipe real
data a recruiter entered. It's deliberately *not* wired into
`startCommand` for that reason.

To seed the freshly-created production database once:

1. Render dashboard → `talent-finder-db` → copy the **External Database
   URL**.
2. Locally:
   ```
   cd server
   DATABASE_URL="<external URL from step 1>" npm run seed
   ```
   (On PowerShell: `$env:DATABASE_URL="<url>"; npm run seed`.)
3. Re-run the same command any time you want to reset the demo data back
   to a clean seeded state — it's the same destructive-and-recreate script
   either way, just never triggered by a deploy.

## 4. URLs

With the default service names in `render.yaml`, Render assigns:

- API: `https://talent-finder-api.onrender.com`
- Client: `https://talent-finder-client.onrender.com`

`render.yaml` already cross-references these two (`CLIENT_ORIGIN` on the
API, `VITE_API_BASE_URL` on the client) so CORS and the frontend's API
base URL are correct out of the box. **If Render appends a random suffix**
to either name (only happens if the plain name is already taken by
someone else on Render), update both of those env var values to match the
real assigned URLs and trigger a redeploy of both services.

## Known limitations of this setup

- **Free-tier API sleeps after inactivity.** The first request after a
  quiet period takes ~30-50s to wake it back up — expected for a demo
  link, not a bug.
- **CV uploads are ephemeral.** `server/uploads/` lives on the free web
  service's local disk, which is wiped on every redeploy/restart. Fine for
  demoing the upload flow; re-upload after a redeploy if you need a
  specific CV to still be attached. (A persistent Render Disk is the
  upgrade path here if this ever needs to be durable — one line in
  `render.yaml`, not a code change.)
- **Free Postgres on Render expires after a fixed period** (per Render's
  current free-tier policy) — fine for an interview demo window, not for
  long-term hosting.
