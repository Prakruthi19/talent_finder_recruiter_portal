import "dotenv/config";
import { createApp } from "./app";
import { assertJwtConfigured } from "./lib/jwt";
import { bootstrapAdmin } from "./services/auth.service";

const port = Number(process.env.PORT) || 4000;

async function main() {
  // Fail at startup, not on the first login, if the signing secret is missing/weak.
  assertJwtConfigured();
  console.log(`Admin bootstrap: ${await bootstrapAdmin()}`);

  createApp().listen(port, () => {
    console.log(`Talent Finder API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
