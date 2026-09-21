import nlp from "compromise";
import { extractExperience } from "./cvExperience";
import { matchSkills } from "./cvSkillMatcher";
import { normalizeCvText } from "./cvTextNormalizer";

export interface ParsedCandidateFields {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  experienceYears?: number;
  /** Skills from the database that the CV mentions. */
  skills: string[];
  /** Skills the CV lists that the database doesn't know yet, offered as suggestions. */
  suggestedSkills: string[];
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?<![\w.])(\+?\d[\d\s().-]{7,17}\d)(?!\w)/g;
const PHONE_LABEL_RE = /\b(?:phone|mobile|mob|tel|cell|contact|call)\b/i;

// Everything about a person is near the top; deeper text is experience prose.
const HEADER_LINES = 20;
const HEADER_CHARS = 500;

const NAME_BLOCKLIST =
  /\b(resume|curriculum|vitae|cv|profile|summary|objective|contact|address|phone|mobile|email|linkedin|github|portfolio|skills?|experience|education|engineer|developer|manager|analyst|consultant|architect|designer|specialist|lead|senior|junior|intern|officer|executive|director|administrator|coordinator|recruiter|full|stack|software|backend|frontend|devops)\b/i;
const NAME_WORD = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.'’-]*$/;

const US_STATE =
  "A[KLRZ]|C[AOT]|DC|DE|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY]";
const PLACE = "[A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+){0,2}";
const CITY_STATE_RE = new RegExp(`\\b(${PLACE}),\\s*(?:${US_STATE})\\b`);
const CITY_COUNTRY_RE = new RegExp(
  `\\b(${PLACE}),\\s*(?:India|USA|United States|UK|United Kingdom|Canada|Australia|Germany|France|Singapore|UAE|Netherlands|Ireland)\\b`
);
const LOCATION_LABEL_RE = /^(?:current\s+)?(?:location|address|city|based in|residence)\s*[:\-–]\s*(.+)$/im;
const KNOWN_CITIES = [
  "Bangalore", "Bengaluru", "Mumbai", "New Delhi", "Delhi NCR", "Delhi", "Gurgaon", "Gurugram", "Noida", "Hyderabad",
  "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Coimbatore", "Chandigarh", "Indore", "Remote",
  "London", "Manchester", "New York", "San Francisco", "San Jose", "Seattle", "Bellevue", "Austin", "Boston", "Chicago",
  "Toronto", "Vancouver", "Singapore", "Dubai", "Berlin", "Amsterdam", "Dublin", "Sydney", "Melbourne", "Paris",
];
const KNOWN_CITY_RE = new RegExp(`(?<![A-Za-z])(${KNOWN_CITIES.join("|")})(?![A-Za-z])`, "i");
// A following ", Karnataka" / ", UK". Case-sensitive on purpose: "Mumbai, working remotely" must not match.
const REGION_AFTER_CITY_RE = /^,\s*[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?/;

const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

function findEmail(text: string): string | undefined {
  const match = text.match(EMAIL_RE)?.[0];
  if (!match) return undefined;
  // PDFs often glue neighbouring fields together: "me@site.comPhone: 555..." -> stop where the case flips.
  const cut = match.replace(/(\.[a-z]+)[A-Z][a-z]*$/, "$1");
  return cut.toLowerCase();
}

function findPhone(text: string, lines: string[]): string | undefined {
  const digitsOf = (s: string) => s.replace(/\D/g, "");
  const plausible = (candidate: string) => {
    const digits = digitsOf(candidate).length;
    return digits >= 10 && digits <= 15 && !/^(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}/.test(candidate);
  };
  const labelled = lines.filter((l) => PHONE_LABEL_RE.test(l)).flatMap((l) => [...l.matchAll(PHONE_RE)].map((m) => m[1]!));
  const all = [...text.matchAll(PHONE_RE)].map((m) => m[1]!.trim());
  return [...labelled, ...all].find(plausible)?.trim();
}

function findName(lines: string[]): string | undefined {
  for (const raw of lines.slice(0, HEADER_LINES)) {
    const line = raw.replace(/^[-*]\s*/, "").trim();
    if (!line || line.length > 45) continue;
    if (/[@\d]|https?:|www\./i.test(line) || NAME_BLOCKLIST.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4 || !words.every((w) => NAME_WORD.test(w))) continue;

    const allCaps = words.every((w) => w === w.toUpperCase());
    const capitalised = words.every((w) => /^[A-ZÀ-Ö]/.test(w));
    if (allCaps) return words.map(titleCase).join(" "); // "JANE DOE" -> "Jane Doe"
    if (capitalised) return words.join(" ");
  }
  return undefined;
}

// Weaker signals, tried only when the header layout gave no name (e.g. a
// letter-spaced heading that lost its word gaps: "PRIYASHARMA").
function findNameFallback(text: string, email: string | undefined): string | undefined {
  const person = (nlp(text.slice(0, HEADER_CHARS)).people().out("array") as string[])[0];
  if (person && person.split(/\s+/).length >= 2) return person;

  // "priya.sharma@example.com" -> "Priya Sharma"
  const parts = email?.split("@")[0]?.match(/^([a-z]{2,})[._-]([a-z]{2,})$/i);
  return parts ? `${titleCase(parts[1]!)} ${titleCase(parts[2]!)}` : undefined;
}

function findLocation(text: string, lines: string[]): string | undefined {
  const labelled = text.match(LOCATION_LABEL_RE)?.[1];
  if (labelled) return labelled.split(/[|•]/)[0]!.trim().replace(/[.,;]+$/, "") || undefined;

  const header = lines.slice(0, HEADER_LINES).filter((l) => l.length <= 90);
  for (const line of header) {
    const place = line.match(CITY_STATE_RE) ?? line.match(CITY_COUNTRY_RE);
    if (place) return place[0].trim();
  }
  for (const line of header) {
    const match = KNOWN_CITY_RE.exec(line);
    if (match) {
      // Canonical capitalisation ("bangalore" -> "Bangalore"), keeping ", Karnataka" if present.
      const city = KNOWN_CITIES.find((c) => c.toLowerCase() === match[1]!.toLowerCase()) ?? match[1]!;
      const region = line.slice(match.index + match[0].length).match(REGION_AFTER_CITY_RE)?.[0] ?? "";
      return city + region;
    }
  }
  // Last resort: compromise's place detector over the very start of the CV.
  return (nlp(text.slice(0, HEADER_CHARS)).places().out("array") as string[])[0];
}

/**
 * Best-effort field extraction from raw CV text. Every field is optional by
 * design: the recruiter always confirms/edits before saving (spec, CV Upload),
 * so a missed field just means an empty input, not a broken flow. `now` only
 * exists so employment-date maths ("2019 - Present") is testable.
 */
export function extractCandidateFields(
  rawText: string,
  knownSkillNames: string[],
  options: { now?: Date } = {}
): ParsedCandidateFields {
  const text = normalizeCvText(rawText);
  const lines = text.split("\n");
  const { skills, suggested } = matchSkills(text, knownSkillNames);
  const email = findEmail(text);

  return {
    fullName: findName(lines) ?? findNameFallback(text, email),
    email,
    phone: findPhone(text, lines),
    location: findLocation(text, lines),
    experienceYears: extractExperience(text, options.now)?.years,
    skills,
    suggestedSkills: suggested,
  };
}
