import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Tenant-scoped endpoints (Candidate, JobOrder, Submission) require the
 * recruiter's selected tenant on every request via the X-Tenant-Id header.
 * There is no "all tenants" view anywhere in the app.
 */
// Tenant ids are `@db.Uuid` columns: Postgres rejects a malformed value with a
// query error, which would surface as a 500 instead of a client error.
const tenantIdSchema = z.string().uuid();

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  const tenantId = req.header("X-Tenant-Id");
  if (!tenantId) {
    throw new AppError("X-Tenant-Id header is required", 400);
  }
  if (!tenantIdSchema.safeParse(tenantId).success) {
    throw new AppError("X-Tenant-Id must be a valid UUID", 400);
  }
  req.tenantId = tenantId;
  next();
}
