import { z } from "zod";

// Every id in this schema is a Postgres @db.Uuid column. Parsing a route param
// through this before it reaches a service/Prisma turns a malformed id into a
// clean 400 ("Validation failed") instead of a raw database error surfacing
// through the generic 500 handler.
export const uuidParamSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
});
