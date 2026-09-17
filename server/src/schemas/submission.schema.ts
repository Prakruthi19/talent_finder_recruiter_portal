import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const submissionListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(["createdAt", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const shortlistCandidateSchema = z.object({
  candidateId: z.string().uuid(),
});
