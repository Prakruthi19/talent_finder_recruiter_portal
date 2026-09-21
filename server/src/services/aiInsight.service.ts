import { generateChatCompletion } from "../lib/aiProvider";
import { loadMatchContext } from "./matchContext";

function buildPrompt(input: {
  candidateName: string;
  candidateExperience: string;
  candidateLocation: string | null;
  jobTitle: string;
  jobMinExperience: string;
  matchedSkills: string[];
  missingSkills: string[];
}) {
  const { candidateName, candidateExperience, candidateLocation, jobTitle, jobMinExperience, matchedSkills, missingSkills } =
    input;

  return [
    {
      role: "system" as const,
      content:
        "You are a recruiting assistant. Given a candidate and a job order's required skills, " +
        "write a concise 2-3 sentence fit assessment for the recruiter. Be direct and specific. " +
        "No preamble, no markdown, plain prose only.",
    },
    {
      role: "user" as const,
      content: [
        `Candidate: ${candidateName}, ${candidateExperience} years experience, based in ${candidateLocation ?? "unspecified location"}.`,
        `Job Order: ${jobTitle}, requires at least ${jobMinExperience} years experience.`,
        `Matched required skills: ${matchedSkills.length ? matchedSkills.join(", ") : "none"}.`,
        `Missing required skills: ${missingSkills.length ? missingSkills.join(", ") : "none"}.`,
      ].join("\n"),
    },
  ];
}

export const aiInsightService = {
  /**
   * Generates a short natural-language fit assessment for one candidate
   * against one job order. Purely additive to the SQL-based skill matching
   * (jobOrder.service.matchingCandidates) — the ranking itself never depends
   * on this; it's a recruiter-facing explanation layered on top.
   */
  async generateMatchInsight(tenantId: string, jobOrderId: string, candidateId: string) {
    const { jobOrder, candidate, matchedSkillNames, missingSkillNames } = await loadMatchContext(
      tenantId,
      jobOrderId,
      candidateId
    );

    const messages = buildPrompt({
      candidateName: candidate.fullName,
      candidateExperience: candidate.experienceYears.toString(),
      candidateLocation: candidate.location,
      jobTitle: jobOrder.title,
      jobMinExperience: jobOrder.minExperience.toString(),
      matchedSkills: matchedSkillNames,
      missingSkills: missingSkillNames,
    });

    const insight = await generateChatCompletion(messages);
    return { insight };
  },
};
