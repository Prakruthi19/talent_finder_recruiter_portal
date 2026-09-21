import { headingKind, sectionLines } from "./cvSections";

const NUM = "(\\d{1,2}(?:\\.\\d)?)";
const YEARS = "(?:years?|yrs?)";
const QUALIFIER = "(?:total|overall|relevant|professional|work|industry|it|software|hands[- ]on|progressive)";

// Deliberately requires the word "experience" (or "exp") so "5 years of Java
// experience" (skill-specific, "Java" isn't a qualifier) and "5 years old" don't count.
const STATED: RegExp[] = [
  // "8+ years of (total) experience", "5 yrs exp"
  new RegExp(`${NUM}\\s*\\+?\\s*${YEARS}\\.?\\s*(?:of\\s+)?(?:${QUALIFIER}\\s+)*(?:experience|exp\\b)`, "gi"),
  // "experience: 5 years", "experience of over 7 years"
  new RegExp(
    `experience\\s*(?:of|:|-|–)?\\s*(?:over|more than|around|about|nearly|approximately)?\\s*${NUM}\\s*\\+?\\s*${YEARS}`,
    "gi"
  ),
];
// "6 years and 3 months of experience"
const STATED_WITH_MONTHS = new RegExp(
  `${NUM}\\s*${YEARS}\\s*(?:and\\s*)?(\\d{1,2})\\s*months?\\s*(?:of\\s+)?(?:${QUALIFIER}\\s+)*(?:experience|exp\\b)`,
  "gi"
);
// "over 10 years", only trusted in the summary at the top of the CV.
const SUMMARY_STATED = new RegExp(`(?:over|more than|around|about|nearly|almost)\\s+${NUM}\\s*\\+?\\s*${YEARS}`, "gi");
const SUMMARY_CHARS = 1500;

const MON = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MON}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const OPEN_END = "present|current|now|till date|to date|ongoing";
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|${OPEN_END})`, "gi");

const EDUCATION_LINE =
  /\b(university|college|school|institute|b\.?\s?tech|b\.?e\b|bachelor|master|m\.?\s?tech|mba|b\.?sc|m\.?sc|diploma|ph\.?d|degree|cgpa|gpa)\b/i;

export interface ExperienceResult {
  years: number;
  source: "stated" | "calculated";
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDate(token: string, now: Date): { index: number; monthPrecision: boolean } | null {
  const t = token.trim().toLowerCase();
  if (new RegExp(`^(?:${OPEN_END})$`).test(t)) return { index: now.getFullYear() * 12 + now.getMonth(), monthPrecision: true };
  let m = t.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const month = MONTH_INDEX[m[1]!.slice(0, 3)];
    return month === undefined ? null : { index: Number(m[2]) * 12 + month, monthPrecision: true };
  }
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]) - 1;
    return month >= 0 && month <= 11 ? { index: Number(m[2]) * 12 + month, monthPrecision: true } : null;
  }
  m = t.match(/^(\d{4})$/);
  return m ? { index: Number(m[1]) * 12, monthPrecision: false } : null;
}

function statedYears(text: string): number | undefined {
  const values: number[] = [];
  for (const re of STATED) for (const m of text.matchAll(re)) values.push(Number(m[1]));
  for (const m of text.matchAll(STATED_WITH_MONTHS)) values.push(Number(m[1]) + Number(m[2]) / 12);
  for (const m of text.slice(0, SUMMARY_CHARS).matchAll(SUMMARY_STATED)) values.push(Number(m[1]));
  const plausible = values.filter((v) => v >= 0 && v <= 50);
  // The largest claim is the best proxy for *total* experience ("12 years total, 5 in Java").
  return plausible.length > 0 ? Math.max(...plausible) : undefined;
}

/** Employment dates -> total years, merging overlapping jobs so nothing is counted twice. */
function calculatedYears(lines: string[], now: Date): number | undefined {
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const intervals: [number, number][] = [];

  for (const match of lines.join("\n").matchAll(RANGE)) {
    const start = parseDate(match[1]!, now);
    const end = parseDate(match[2]!, now);
    if (!start || !end) continue;
    const from = start.index;
    const to = Math.min(end.index + (start.monthPrecision && end.monthPrecision ? 1 : 0), nowIndex + 1);
    if (from < 1970 * 12 || from > nowIndex || to <= from || to - from > 600) continue;
    intervals.push([from, to]);
  }
  if (intervals.length === 0) return undefined;

  intervals.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let [curStart, curEnd] = intervals[0]!;
  for (const [s, e] of intervals.slice(1)) {
    if (s <= curEnd) curEnd = Math.max(curEnd, e);
    else {
      months += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  months += curEnd - curStart;
  return Math.round((months / 12) * 2) / 2; // nearest half year
}

/**
 * Total years of experience: an explicit claim in the CV wins, otherwise it is
 * worked out from the employment dates (never from education dates).
 */
export function extractExperience(text: string, now: Date = new Date()): ExperienceResult | undefined {
  const stated = statedYears(text);
  if (stated !== undefined) return { years: stated, source: "stated" };

  const lines = text.split("\n");
  let workLines = sectionLines(lines, "experience", 200);
  if (workLines.length === 0) {
    // No recognisable Experience heading: use every line except education ones
    // (and the line after one, which is often the degree's date range).
    workLines = lines.filter((line, i) => {
      if (headingKind(line)) return false;
      return !EDUCATION_LINE.test(line) && !EDUCATION_LINE.test(lines[i - 1] ?? "");
    });
  }
  const calculated = calculatedYears(workLines, now);
  return calculated !== undefined && calculated > 0 && calculated <= 50 ? { years: calculated, source: "calculated" } : undefined;
}
