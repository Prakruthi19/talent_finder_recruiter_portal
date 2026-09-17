interface SkillLike {
  skill: { id: string; name: string };
}

export interface MatchResult {
  matchCount: number;
  matchedSkillNames: string[];
}

/**
 * Core matching algorithm: exact, case-insensitive skill-name intersection.
 * Skill names are already normalized to lowercase in the Skill table, so a
 * plain Set intersection is enough here.
 */
export function computeMatch(
  candidateSkills: SkillLike[],
  requiredSkills: SkillLike[]
): MatchResult {
  const requiredNames = new Set(requiredSkills.map((s) => s.skill.name));
  const matched = candidateSkills
    .map((s) => s.skill.name)
    .filter((name) => requiredNames.has(name));

  return { matchCount: matched.length, matchedSkillNames: matched };
}
