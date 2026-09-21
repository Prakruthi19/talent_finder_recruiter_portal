import { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { verifyToken } from "../lib/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string };
      role?: Role;
    }
  }
}

/** Requires `Authorization: Bearer <jwt>`; sets req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const match = req.header("Authorization")?.match(/^Bearer (.+)$/i);
  if (!match?.[1]) throw new UnauthorizedError();
  req.user = { id: verifyToken(match[1]) };
  next();
}

export function getUserId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

/** Use after requireTenant: the role is the caller's role in *that* tenant. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      throw new ForbiddenError("Only a tenant admin can do this");
    }
    next();
  };
}
