import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function limiter(limit: number, message: string) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Same `{ error }` shape as errorHandler so the client handles it uniformly.
    message: { error: message },
  });
}

/** Each call is a paid request to the AI provider, so this is the strictest limit. */
export const aiLimiter = limiter(20, "Too many AI insight requests. Please try again in a few minutes.");

/** Applied before multer so a rejected request never writes a file to disk. */
export const uploadLimiter = limiter(30, "Too many CV uploads. Please try again in a few minutes.");
