import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function limiter(limit: number, message: string) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Signed-in requests are limited per user, so one office IP can't exhaust a
    // colleague's quota (and a user can't dodge it by changing IP). The IP is
    // the fallback for anything reaching a limiter before authentication.
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
    // Same `{ error }` shape as errorHandler so the client handles it uniformly.
    message: { error: message },
  });
}

/** Each call is a paid request to the AI provider, so this is the strictest limit. */
export const aiLimiter = limiter(20, "Too many AI requests. Please try again in a few minutes.");

/** Applied before multer so a blocked request never writes a file to disk. */
export const uploadLimiter = limiter(30, "Too many CV uploads. Please try again in a few minutes.");

/** Login is keyed by IP (no user yet); slows password guessing. */
export const loginLimiter = limiter(10, "Too many login attempts. Please try again in a few minutes.");

/**
 * The account a login attempt names, regardless of who's asking. An
 * IP-based limit alone doesn't stop a botnet spreading guesses at one
 * account across many IPs (a "credential stuffing" / distributed brute-force
 * pattern) — this catches that case even though no single IP looks abusive.
 * "no-email" is a shared bucket for a malformed request with no email at
 * all; those fail validation immediately anyway, so sharing a bucket for
 * them is harmless.
 */
export function loginAccountKey(req: Request): string {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : "no-email";
}

/** Applied alongside loginLimiter (per IP): both must pass. Tighter, since one real account matters more than one IP. */
export const loginLimiterPerAccount = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: loginAccountKey,
  message: { error: "Too many attempts for this account. Please try again in a few minutes." },
});

/** For endpoints where AI is opt-in per request (?ai=true): only those calls spend the AI budget. */
export const aiLimiterIfRequested: RequestHandler = (req, res, next) =>
  req.query.ai === "true" ? aiLimiter(req, res, next) : next();
