import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors";

const ALGORITHM = "HS256";

function secret(): string {
  const value = process.env.JWT_SECRET;
  // Refusing short secrets makes a placeholder like "changeme" fail loudly at startup.
  if (!value || value.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return value;
}

/** Called once at startup so a misconfigured server never boots half-working. */
export function assertJwtConfigured(): void {
  secret();
}

export function signToken(userId: string): string {
  return jwt.sign({}, secret(), {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Returns the user id from a valid token. `algorithms` is pinned so a token
 * signed with `alg: none` (or any other algorithm) is rejected.
 */
export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, secret(), { algorithms: [ALGORITHM] });
    const userId = typeof payload === "object" ? payload.sub : undefined;
    if (!userId) throw new UnauthorizedError("Invalid token");
    return userId;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired token");
  }
}
