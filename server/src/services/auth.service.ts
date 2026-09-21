import { userRepository } from "../repositories/user.repository";
import { membershipRepository } from "../repositories/membership.repository";
import { tenantRepository } from "../repositories/tenant.repository";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { signToken } from "../lib/jwt";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "../lib/password";

export async function getProfile(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw new UnauthorizedError();

  const memberships = await membershipRepository.findByUser(userId);
  return {
    user: { id: user.id, email: user.email, name: user.name },
    tenants: memberships.map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      status: m.tenant.status,
      role: m.role,
    })),
  };
}

export async function login(email: string, password: string) {
  const user = await userRepository.findByEmail(email);
  // Always verified, even for an unknown email, so both failures look identical.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) throw new UnauthorizedError("Invalid email or password");

  return { token: signToken(user.id), ...(await getProfile(user.id)) };
}

/**
 * The server-side answer to "may this user act on this tenant?". The
 * X-Tenant-Id header is only a *request*; this is what makes it trustworthy.
 */
export async function requireMembership(userId: string, tenantId: string) {
  const membership = await membershipRepository.find(userId, tenantId);
  if (!membership) throw new ForbiddenError("You don't have access to this tenant");
  return membership.role;
}

/**
 * First-run bootstrap for hosts with no shell (e.g. Render's free plan): when
 * BOOTSTRAP_ADMIN_* are set and there are no users at all, create one admin of
 * every existing tenant. Never touches an existing user table, never wipes data.
 */
export async function bootstrapAdmin(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const email = env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return "skipped (BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set)";
  if (password.length < MIN_PASSWORD_LENGTH) return "skipped (BOOTSTRAP_ADMIN_PASSWORD is too short)";
  if ((await userRepository.count()) > 0) return "skipped (users already exist)";

  const user = await userRepository.create({
    email,
    name: env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrator",
    passwordHash: await hashPassword(password),
  });
  const tenants = await tenantRepository.findAll();
  await Promise.all(tenants.map((t) => membershipRepository.upsert(user.id, t.id, "ADMIN")));
  return `created admin ${email} for ${tenants.length} tenant(s)`;
}
