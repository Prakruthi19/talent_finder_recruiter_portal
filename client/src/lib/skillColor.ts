// Deterministic color per skill name so the same skill always renders the
// same color everywhere in the app (list rows, detail pages, matching view).
// Palette intentionally avoids red/green — those are reserved for status
// semantics (StatusBadge, matched-skill highlighting).
const PALETTE = [
  "border-blue-200 bg-blue-50 text-blue-700",
  "border-purple-200 bg-purple-50 text-purple-700",
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-cyan-200 bg-cyan-50 text-cyan-700",
  "border-indigo-200 bg-indigo-50 text-indigo-700",
  "border-pink-200 bg-pink-50 text-pink-700",
  "border-teal-200 bg-teal-50 text-teal-700",
  "border-orange-200 bg-orange-50 text-orange-700",
  "border-violet-200 bg-violet-50 text-violet-700",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
];

export function getSkillColorClasses(skillName: string): string {
  let hash = 0;
  for (let i = 0; i < skillName.length; i++) {
    hash = (hash * 31 + skillName.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}
