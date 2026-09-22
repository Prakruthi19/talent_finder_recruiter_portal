/**
 * Logs an unexpected error without the parts that tend to carry real data:
 * a raw `console.error(err)` on a Prisma error can print the literal value
 * that violated a constraint, and on some errors, request internals. Logs
 * are copied to more places (log aggregators, terminals, screenshares) than
 * the database ever is, so they get the same "minimise what's written" rule
 * as anything sent to a third party.
 *
 * Keeps only name, message and the first few stack frames — enough to find
 * the failing line, not enough to be a second copy of the data itself.
 */
export function logError(context: string, err: unknown): void {
  if (err instanceof Error) {
    const stack = err.stack?.split("\n").slice(0, 4).join("\n");
    console.error(`[${context}] ${err.name}: ${err.message}${stack ? `\n${stack}` : ""}`);
  } else {
    console.error(`[${context}] non-Error thrown:`, typeof err);
  }
}
