import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { logError } from "../lib/safeLog";

/** Client errors raised by Express middleware (e.g. body-parser): carry a 4xx `status` and are safe to show. */
function isExposedClientError(err: unknown): err is { status: number; message: string } {
  if (typeof err !== "object" || err === null) return false;
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  return typeof status === "number" && status >= 400 && status < 500 && expose === true;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.flatten() });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? "That file is too large (5MB maximum)" : err.message });
    return;
  }

  // Oversized or malformed JSON bodies: a client mistake, not a server fault.
  if (isExposedClientError(err)) {
    res.status(err.status).json({ error: err.status === 413 ? "Request body is too large" : err.message });
    return;
  }

  logError("unhandled", err);
  res.status(500).json({ error: "Internal server error" });
}
