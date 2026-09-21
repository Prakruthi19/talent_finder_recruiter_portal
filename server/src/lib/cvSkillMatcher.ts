import Fuse from "fuse.js";
import { sectionLines } from "./cvSections";

// Alternative spellings of skills that exist in the database (keyed by the
// canonical, lowercase name). Only applied when that skill is actually known,
// so the list never introduces skills of its own.
const ALIASES: Record<string, string[]> = {
  react: ["reactjs", "react.js", "react js"],
  "node.js": ["nodejs", "node js", "node"],
  javascript: ["js", "ecmascript", "es6"],
  typescript: ["ts"],
  postgresql: ["postgres", "psql"],
  kubernetes: ["k8s"],
  golang: ["go lang"],
  aws: ["amazon web services"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  "machine learning": ["ml"],
  "data analysis": ["data analytics"],
  "rest apis": ["rest api", "restful", "restful api", "restful apis"],
  "html/css": ["html", "css", "html5", "css3"],
  "spring boot": ["springboot"],
  "vue.js": ["vue", "vuejs"],
  angular: ["angularjs", "angular.js"],
  mongodb: ["mongo"],
  python: ["python3"],
  "c#": ["csharp", "c sharp"],
  sql: ["t-sql", "pl/sql", "plsql"],
  communication: ["communications"],
};

const STOPWORDS = new Set(
  (
    "and or the with etc others other basic advanced intermediate beginner expert proficient familiar knowledge " +
    "experience years year good strong excellent skills skill tools technologies technology languages frameworks " +
    "databases platforms concepts methodologies various including such as using of in on to a an working hands"
  ).split(" ")
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Every spelling of a skill worth recognising: itself, its aliases, and punctuation-free forms. */
function termsFor(name: string): string[] {
  const lower = name.toLowerCase();
  const variants = new Set<string>([lower, ...(ALIASES[lower] ?? [])]);
  variants.add(lower.replace(/\./g, "")); // node.js -> nodejs
  variants.add(lower.replace(/\./g, " ")); // node.js -> node js
  variants.add(lower.replace(/[/-]/g, " ")); // ci/cd -> ci cd
  variants.add(lower.replace(/\s+/g, "")); // spring boot -> springboot
  return [...variants].filter((v) => v.length >= 2);
}

/**
 * Whole-term match, so "java" is not found inside "javascript" and "sql" is
 * not found inside "postgresql". Boundaries are "anything but a letter/digit",
 * which also lets "c#", "node.js" and "ci/cd" work.
 */
function termRegex(terms: string[]): RegExp {
  const alternation = [...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![a-z0-9])(?:${alternation})(?![a-z0-9])`, "i");
}

/** Optimal-string-alignment distance: like Levenshtein, but a swapped pair ("ir" vs "ri") costs 1. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[a.length]![b.length]!;
}

/** A typo, not a different word: same first letter, similar length, few edits. */
function isTypoOf(token: string, skill: string): boolean {
  if (token[0] !== skill[0] || Math.abs(token.length - skill.length) > 2) return false;
  return editDistance(token, skill) <= (Math.max(token.length, skill.length) >= 8 ? 2 : 1);
}

export interface SkillMatches {
  /** Skills from the database that the CV mentions (canonical names). */
  skills: string[];
  /** Skills listed in the CV's Skills section that the database doesn't know yet. */
  suggested: string[];
}

export function matchSkills(text: string, knownSkillNames: string[]): SkillMatches {
  if (knownSkillNames.length === 0) return { skills: [], suggested: suggestUnknown(text, [], () => false) };

  const known = knownSkillNames.map((name) => ({ name, terms: termsFor(name) }));
  const compiled = known.map((k) => ({ ...k, re: termRegex(k.terms) }));
  const allTerms = new Set(known.flatMap((k) => k.terms));

  const found = new Set<string>();
  for (const skill of compiled) if (skill.re.test(text)) found.add(skill.name);

  // Typos ("Typescirpt"): fuse.js proposes near words, an edit-distance gate decides.
  const singleWord = known.map((k) => k.name).filter((name) => !/\s/.test(name));
  const fuse = new Fuse(singleWord, { threshold: 0.4, ignoreLocation: true, minMatchCharLength: 4 });
  const nearKnown = (token: string) =>
    fuse.search(token, { limit: 3 }).map((r) => r.item).find((skill) => isTypoOf(token, skill.toLowerCase()));

  const tokens = new Set(text.toLowerCase().match(/[a-z][a-z0-9+#.]{4,}/g) ?? []);
  for (const token of tokens) {
    if (allTerms.has(token)) continue;
    const hit = nearKnown(token);
    if (hit) found.add(hit);
  }

  const covered = (token: string) =>
    allTerms.has(token) || compiled.some((s) => s.re.test(token)) || nearKnown(token) !== undefined;

  return { skills: [...found], suggested: suggestUnknown(text, [...found], covered) };
}

/**
 * Items in the CV's own Skills section that no known skill accounts for. They
 * are only *suggestions* for the recruiter to accept, never added silently.
 */
function suggestUnknown(text: string, found: string[], covered: (token: string) => boolean): string[] {
  const lines = text.split("\n");
  const skillLines = [
    ...sectionLines(lines, "skills", 40),
    // "Skills: Python, Java" on a single line
    ...lines.map((l) => l.match(/^(?:technical\s+|key\s+|core\s+)?skills?\s*[:\-–]\s*(.+)$/i)?.[1] ?? "").filter(Boolean),
  ];

  const suggestions = new Set<string>();
  for (const line of skillLines) {
    // "Languages: Python, Java" -> "Python, Java"
    const content = line.includes(":") ? line.slice(line.indexOf(":") + 1) : line;
    for (const raw of content.replace(/\([^)]*\)/g, "").split(/[,;|•]|\s+-\s+|\s+and\s+|\s{2,}/)) {
      const token = raw.trim().replace(/^[-*]\s*/, "").replace(/[.:]+$/, "").toLowerCase();
      const words = token.split(/\s+/);
      if (token.length < 2 || token.length > 30 || words.length > 3) continue;
      if (!/^[a-z][a-z0-9 +#./&-]*$/.test(token)) continue;
      if (words.every((w) => STOPWORDS.has(w)) || STOPWORDS.has(words[0]!)) continue;
      if (found.includes(token) || covered(token)) continue;
      suggestions.add(token);
      if (suggestions.size >= 15) return [...suggestions];
    }
  }
  return [...suggestions];
}
