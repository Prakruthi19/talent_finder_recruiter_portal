import { z } from "zod";
import { generateJson, untrusted, untrustedNote } from "./aiJson";
import type { ParsedCandidateFields } from "./cvFieldExtractor";

// Every field is optional and falls back to "missing" on its own: one bad value
// from the model (an invalid email, a string where a number belongs) must not
// throw away the rest of a good extraction.
const optional = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().catch(undefined);

const aiCvSchema = z.object({
  fullName: optional(z.string().trim().min(1).max(160)),
  email: optional(z.string().trim().email().max(254)),
  phone: optional(z.string().trim().max(40)),
  location: optional(z.string().trim().max(160)),
  experienceYears: optional(z.number().min(0).max(50)),
  skills: z.array(z.string().trim().min(1).max(40)).max(60).catch([]),
});

export type AiCvFields = z.infer<typeof aiCvSchema>;

const systemPrompt = (today: string) =>
  `Today's date is ${today}. ` +
  "You extract structured data from a resume. Reply with ONLY one JSON object with the keys " +
  '"fullName", "email", "phone", "location" (city and region), "experienceYears" (a number: total years of ' +
  'professional work experience, from the job history dates if not stated) and "skills" (an array of short, ' +
  "lowercase skill names). Use null for anything you cannot find. Do not guess. " +
  untrustedNote("cv");

export function extractFieldsWithAi(text: string, knownSkillNames: string[]): Promise<AiCvFields> {
  const known = knownSkillNames.slice(0, 200).join(", ");
  return generateJson(
    [
      { role: "system", content: systemPrompt(new Date().toISOString().slice(0, 10)) },
      {
        role: "user",
        content:
          `Known skills (use exactly these names whenever the resume mentions them): ${known}\n\n` + untrusted("cv", text),
      },
    ],
    aiCvSchema,
    { maxTokens: 700 }
  );
}

const unique = (items: string[]) => [...new Set(items)];

/**
 * Combines the deterministic extraction with the model's. Regex-found email,
 * phone and experience are kept (they are exact); the model is preferred only
 * for the judgement calls (name, place). Skills the model names that aren't in
 * the database become *suggestions*, never silently added.
 */
export function mergeAiFields(
  heuristic: ParsedCandidateFields,
  ai: AiCvFields,
  knownSkillNames: string[]
): ParsedCandidateFields {
  const canonical = new Map(knownSkillNames.map((name) => [name.toLowerCase(), name]));
  const aiKnown: string[] = [];
  const aiOther: string[] = [];
  for (const skill of ai.skills) {
    const key = skill.toLowerCase();
    const known = canonical.get(key);
    if (known) aiKnown.push(known);
    else aiOther.push(key);
  }

  const skills = unique([...heuristic.skills, ...aiKnown]);
  return {
    fullName: ai.fullName ?? heuristic.fullName,
    email: heuristic.email ?? ai.email?.toLowerCase(),
    phone: heuristic.phone ?? ai.phone ?? undefined,
    location: ai.location ?? heuristic.location,
    // Not the model's: it doesn't know today's date, so on a real CV it read "Present"
    // as ~2023 and answered 7 years for a career of 10.5. Dates are maths, and the
    // heuristic does that exactly; the model only fills in when there was nothing to compute.
    experienceYears: heuristic.experienceYears ?? ai.experienceYears ?? undefined,
    skills,
    suggestedSkills: unique([...heuristic.suggestedSkills, ...aiOther])
      .filter((s) => !skills.includes(s))
      .slice(0, 20),
  };
}
