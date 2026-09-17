import { z } from "zod";
import { paginationQuerySchema } from "./common.schema";

export const jobOrderListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(["title", "location", "minExperience", "createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const skillsField = z.preprocess(
  (val) => (typeof val === "string" ? [val] : val),
  z.array(z.string().trim().min(1)).min(1, "At least one required skill is needed")
);

export const createJobOrderSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(160),
  clientName: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => v || undefined),
  location: z.string().trim().min(1, "Location is required").max(160),
  minExperience: z.coerce.number().min(0).max(60),
  numberOfOpenings: z.coerce.number().int().min(1, "At least 1 opening is required"),
  skills: skillsField,
});

export const updateJobOrderSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  clientName: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => v || undefined),
  location: z.string().trim().min(1).max(160).optional(),
  minExperience: z.coerce.number().min(0).max(60).optional(),
  numberOfOpenings: z.coerce.number().int().min(1).optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  skills: skillsField.optional(),
});
