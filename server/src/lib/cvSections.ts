/**
 * CVs are laid out in sections ("Experience", "Education", "Skills"...). Two
 * extractors need that structure: experience must not count a degree's dates,
 * and skills wants the Skills block. Headings are short, digit-free lines.
 */
export type SectionKind = "experience" | "skills" | "education" | "other";

const EDUCATION = /^(?:education|academic|academics|qualifications?)\b/i;
const SKILLS =
  /^(?:(?:technical|key|core|professional|it|tech)\s+)?(?:skills?|technologies|tech stack|competenc(?:y|ies)|expertise|proficienc(?:y|ies)|tools(?:\s*(?:&|and)\s*technologies)?)(?:\s*(?:&|and)\s*[a-z ]+)?$/i;
const EXPERIENCE =
  /^(?:(?:work|professional|employment|relevant|industry|internship)\s+)?(?:experience|history)$|^employment(?:\s+history)?$|^career(?:\s+(?:history|summary))?$/i;
const OTHER =
  /^(?:projects?|certifications?|awards?|publications?|languages|interests|hobbies|references|achievements|summary|profile|objective|training|courses|volunteer(?:ing)?|personal (?:details|information))\b/i;

export function headingKind(line: string): SectionKind | null {
  const text = line.trim().replace(/[:\-–]+$/, "").trim();
  if (text.length === 0 || text.length > 40 || /\d/.test(text)) return null;
  if (!/^[A-Za-z &/,]+$/.test(text)) return null;
  if (EDUCATION.test(text)) return "education";
  if (SKILLS.test(text)) return "skills";
  if (EXPERIENCE.test(text)) return "experience";
  if (OTHER.test(text)) return "other";
  return null;
}

/** Lines under the first heading of `kind`, up to the next heading (or `maxLines`). */
export function sectionLines(lines: string[], kind: SectionKind, maxLines = 60): string[] {
  const collected: string[] = [];
  let inside = false;
  for (const line of lines) {
    const heading = headingKind(line);
    if (heading) {
      if (inside && heading !== kind) inside = false;
      else if (heading === kind) inside = true;
      continue;
    }
    if (inside && collected.length < maxLines) collected.push(line);
  }
  return collected;
}
