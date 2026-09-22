import { z } from "zod";

export const scheduleInterviewSchema = z.object({
  submissionId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  mode: z.enum(["PHONE", "VIDEO", "ONSITE"]),
  notes: z.string().trim().max(500).optional(),
});

export const updateInterviewSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});
