/**
 * Creates (or updates the memberships of) a user without touching any other data.
 * Safe to run against a live database, unlike prisma/seed.ts which wipes everything.
 *
 *   npm run create-user -- --email ada@example.com --name "Ada Lovelace" \
 *     --tenant LinkedIn:ADMIN --tenant Monster:RECRUITER
 *   npm run create-user -- --email ada@example.com --name Ada --all-tenants ADMIN
 *
 * The password is read from --password or, better (it stays out of shell
 * history), from the USER_PASSWORD environment variable.
 */
import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/lib/prisma";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/password";
import { userRepository } from "../src/repositories/user.repository";
import { membershipRepository } from "../src/repositories/membership.repository";
import { tenantRepository } from "../src/repositories/tenant.repository";

const roleSchema = z.enum(["ADMIN", "RECRUITER"]);

function parseArgs(argv: string[]) {
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) continue;
    const value = argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[++i]! : "";
    flags.set(arg.slice(2), [...(flags.get(arg.slice(2)) ?? []), value]);
  }
  return {
    one: (name: string) => flags.get(name)?.[0],
    all: (name: string) => flags.get(name) ?? [],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const email = z.string().trim().toLowerCase().email().parse(args.one("email"));
  const name = z.string().trim().min(1, "--name is required").parse(args.one("name"));
  const password = args.one("password") ?? process.env.USER_PASSWORD;

  const grants: { tenantName: string | null; role: z.infer<typeof roleSchema> }[] = args.all("tenant").map((spec) => {
    const [tenantName, role = "RECRUITER"] = spec.split(":");
    return { tenantName: tenantName ?? "", role: roleSchema.parse(role.toUpperCase()) };
  });
  const allTenantsRole = args.one("all-tenants");
  if (allTenantsRole !== undefined) grants.push({ tenantName: null, role: roleSchema.parse(allTenantsRole.toUpperCase()) });
  if (grants.length === 0) throw new Error("Give at least one --tenant Name:ROLE or --all-tenants ROLE");

  let user = await userRepository.findByEmail(email);
  if (user) {
    console.log(`User ${email} already exists; only updating memberships.`);
  } else {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`A new user needs a password of at least ${MIN_PASSWORD_LENGTH} characters (--password or USER_PASSWORD)`);
    }
    user = await userRepository.create({ email, name, passwordHash: await hashPassword(password) });
    console.log(`Created user ${email}`);
  }

  for (const { tenantName, role } of grants) {
    const tenants = tenantName === null ? await tenantRepository.findAll() : [await tenantRepository.findByName(tenantName)];
    for (const tenant of tenants) {
      if (!tenant) throw new Error(`No tenant named "${tenantName}"`);
      await membershipRepository.upsert(user.id, tenant.id, role);
      console.log(`  ${role.padEnd(9)} in ${tenantName ?? tenant.id}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
