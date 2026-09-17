import nlp from "compromise";
import Fuse from "fuse.js";

export interface ParsedCandidateFields {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  experienceYears?: number;
  skills: string[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const EXPERIENCE_RE = /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\.?\s*(?:of\s*)?(?:experience|exp\.?)/i;

// compromise's people()/places() plugins are cheap but not free — most CVs
// put name/location in the header, so only the first chunk of text is worth
// running entity recognition over.
const HEADER_CHARS = 500;

/**
 * Best-effort field extraction from raw CV text. Every field is optional by
 * design — the recruiter always confirms/edits before saving (see the
 * spec's CV Upload acceptance criteria), so a missed field just means an
 * empty input, not a broken flow.
 */
export function extractCandidateFields(text: string, knownSkillNames: string[]): ParsedCandidateFields {
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.trim();

  const expMatch = text.match(EXPERIENCE_RE);
  const experienceYears = expMatch?.[1] ? Number(expMatch[1]) : undefined;

  const header = nlp(text.slice(0, HEADER_CHARS));
  const fullName = firstOrUndefined(header.people().out("array") as string[]);
  const location = firstOrUndefined(header.places().out("array") as string[]);

  return {
    fullName,
    email,
    phone,
    location,
    experienceYears,
    skills: matchKnownSkills(text, knownSkillNames),
  };
}

function firstOrUndefined(arr: string[]): string | undefined {
  return arr.length > 0 ? arr[0] : undefined;
}

/**
 * Which of the tenant's known skills appear in the CV text. Exact
 * substring matching first (fast, zero false positives), then a fuzzy pass
 * with fuse.js to catch near-misses exact matching drops — typos, or
 * formatting differences like "Node JS" vs "node.js". This fuzzy step is
 * scoped to CV parsing only; the core Job Order matching algorithm stays
 * exact keyword matching per the spec.
 */
function matchKnownSkills(text: string, knownSkillNames: string[]): string[] {
  if (knownSkillNames.length === 0) return [];

  const lowerText = text.toLowerCase();
  const exact = knownSkillNames.filter((name) => lowerText.includes(name.toLowerCase()));

  // threshold/minMatchCharLength are both deliberately strict: fuse.js's
  // fuzzy scoring on short strings is noisy (e.g. "India" spuriously
  // matching "django" at threshold 0.25 with no length floor) — this is
  // only meant to catch typos/formatting on genuinely similar words, not
  // to loosely associate short unrelated tokens.
  const fuse = new Fuse(knownSkillNames, { threshold: 0.2, ignoreLocation: true, minMatchCharLength: 4 });
  const words = Array.from(
    new Set(
      text
        .split(/[\s,;|•/\\()[\]]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 3)
    )
  );
  const fuzzy = words.flatMap((word) => fuse.search(word, { limit: 1 }).map((r) => r.item));

  return Array.from(new Set([...exact, ...fuzzy]));
}
