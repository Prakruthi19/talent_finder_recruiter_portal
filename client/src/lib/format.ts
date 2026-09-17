export function formatExperience(years: string | number): string {
  const n = Number(years);
  return `${n} ${n === 1 ? "yr" : "yrs"}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
