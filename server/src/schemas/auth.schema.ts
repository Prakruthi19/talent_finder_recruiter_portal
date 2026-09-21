import { z } from "zod";

export const loginSchema = z.object({
  // Lowercased so login is case-insensitive; users are stored lowercased too.
  email: z.string().trim().toLowerCase().email().max(254),
  // Only bounded, never length-checked against the policy: existing passwords must still work.
  password: z.string().min(1).max(200),
});
