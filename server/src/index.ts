import "dotenv/config";
import { createApp } from "./app";
import { assertJwtConfigured } from "./lib/jwt";
import { initRls } from "./lib/prisma";
import { bootstrapAdmin } from "./services/auth.service";

const port = Number(process.env.PORT) || 4000;

async function main() {
  // Fail at startup, not on the first login, if the signing secret is missing/weak.
  assertJwtConfigured();

  // Row-level security silently does nothing for a superuser connection, so say so out loud.
  const rls = await initRls();
  if (rls.enforced) {
    console.log(`Row-level security: enforced (queries run as "${rls.role}"${rls.usingAppRole ? ", via the app role" : ", the table owner, FORCE mode"})`);
  } else {
    console.warn(`Row-level security: NOT enforced. ${rls.problems.join("; ")}`);
    // RLS_REQUIRED=true makes this fatal: the safe setting for production.
    if (process.env.RLS_REQUIRED === "true") throw new Error("RLS_REQUIRED is set but row-level security is not enforced");
  }

  console.log(`Admin bootstrap: ${await bootstrapAdmin()}`);

  createApp().listen(port, () => {
    console.log(`Talent Finder API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
