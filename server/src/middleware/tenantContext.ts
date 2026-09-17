import { NextFunction, Request, Response } from "express";
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
export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  const tenantId = req.header("X-Tenant-Id");
  if (!tenantId) {
    throw new AppError("X-Tenant-Id header is required", 400);
  }
  req.tenantId = tenantId;
  next();
}
