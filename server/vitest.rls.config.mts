import { defineConfig } from "vitest/config";

// Integration tests that need a REAL Postgres. Kept out of the default `npm test`
// (which needs no database). Run with: npm run test:rls
// They refuse to run against anything but databases named like the scratch ones.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests-integration/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One database, one test file at a time.
    fileParallelism: false,
  },
});
