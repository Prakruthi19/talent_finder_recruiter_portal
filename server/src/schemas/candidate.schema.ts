import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const candidateListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(["fullName", "location", "experienceYears", "createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const skillsField = z.preprocess(
  (val) => (typeof val === "string" ? [val] : val),
  z.array(z.string().trim().min(1)).min(1, "At least one skill is required")
);

// Stored lowercase so the (tenantId, email) unique index behaves case-insensitively.
const emailField = z
  .string()
  .trim()
  .email()
  .optional()
  .or(z.literal(""))
  .transform((v) => v?.toLowerCase() || undefined);

export const createCandidateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(160),
  email: emailField,
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
  location: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => v || undefined),
  experienceYears: z.coerce.number().min(0).max(60),
  skills: skillsField,
});

export const updateCandidateSchema = z.object({
  fullName: z.string().trim().min(1).max(160).optional(),
  email: emailField,
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
  location: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => v || undefined),
  experienceYears: z.coerce.number().min(0).max(60).optional(),
  skills: skillsField.optional(),
});
