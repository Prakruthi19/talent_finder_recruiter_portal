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
 * A short-lived, signed value carried through Google's redirect as `state`, so a
 * callback can't be forged. It embeds a nonce that must also match an httpOnly
 * cookie in the same browser, which stops a login-CSRF where an attacker
 * makes a victim complete the attacker's own sign-in.
 */
export function signOAuthState(nonce: string): string {
  return jwt.sign({ purpose: "oauth-state", nonce }, secret(), { algorithm: ALGORITHM, expiresIn: "10m" });
}

export function verifyOAuthState(state: string): string {
  try {
    const payload = jwt.verify(state, secret(), { algorithms: [ALGORITHM] });
    if (typeof payload === "object" && payload.purpose === "oauth-state" && typeof payload.nonce === "string") {
      return payload.nonce;
    }
  } catch {
    // fall through to the generic error
  }
  throw new UnauthorizedError("Invalid or expired sign-in state");
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
