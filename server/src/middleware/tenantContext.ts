import { z } from "zod";
import { AppError, UnauthorizedError } from "../lib/errors";
import { requireMembership } from "../services/auth.service";
import { runWithTenant } from "../lib/tenantScope";
import { asyncHandler } from "./asyncHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

// Tenant ids are `@db.Uuid` columns: Postgres rejects a malformed value with a
// query error, which would surface as a 500 instead of a client error.
const tenantIdSchema = z.string().uuid();

/**
 * Tenant-scoped endpoints (Candidate, JobOrder, Submission) need the tenant the
 * recruiter is working in, sent as X-Tenant-Id. That header is only a *request*:
 * it is honoured only if the signed-in user is a member of that tenant, so
 * changing it to another tenant's id gets a 403, not that tenant's data.
 * Must run after requireAuth. There is no "all tenants" view anywhere.
 */
export const requireTenant = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw new UnauthorizedError();

  const tenantId = req.header("X-Tenant-Id");
  if (!tenantId) {
    throw new AppError("X-Tenant-Id header is required", 400);
  }
  if (!tenantIdSchema.safeParse(tenantId).success) {
    throw new AppError("X-Tenant-Id must be a valid UUID", 400);
  }

  req.role = await requireMembership(req.user.id, tenantId);
  req.tenantId = tenantId;
  // From here on, everything this request awaits runs as this tenant: lib/prisma.ts tells
  // Postgres, whose row-level security then refuses any other tenant's rows.
  runWithTenant(tenantId, () => next());
});
