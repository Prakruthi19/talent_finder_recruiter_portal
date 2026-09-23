import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(1000),
});
