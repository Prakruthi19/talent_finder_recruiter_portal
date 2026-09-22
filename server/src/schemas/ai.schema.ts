import { z } from "zod";

export const parseJobDescriptionSchema = z.object({
  // Bounded: this text is sent to a paid API.
  text: z.string().trim().min(40, "Paste the full job description").max(12000),
});

export const candidateIdSchema = z.object({
  candidateId: z.string().uuid(),
});

export const outreachSchema = candidateIdSchema.extend({
  tone: z.enum(["friendly", "formal"]).default("friendly"),
});

export const candidateSearchSchema = z.object({
  query: z.string().trim().min(3, "Describe who you are looking for").max(300),
});

export const interviewMessageSchema = z.object({
  kind: z.enum(["confirmation", "reminder"]),
});
