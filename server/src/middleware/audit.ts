import { NextFunction, Request, Response } from "express";
import { auditService, extractEntityId, normalizePath } from "../services/audit.service";

const READ_ONLY = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Records who did what for every *successful* write. It listens for the end of
 * the response, so it never slows a request down or changes its outcome, and
 * it sees the user/tenant that the auth middleware attached along the way.
 * Failed requests (4xx/5xx) changed nothing, so they are not "activity".
 */
export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (READ_ONLY.has(req.method)) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    // A login has no req.user; the controller leaves the id in res.locals.
    const userId = req.user?.id ?? (res.locals.actorId as string | undefined);
    if (!userId) return;

    const path = req.originalUrl;
    void auditService.record({
      tenantId: req.tenantId,
      userId,
      action: `${req.method} ${normalizePath(path)}`,
      entityId: extractEntityId(path),
      meta: { status: res.statusCode },
    });
  });
  next();
}
