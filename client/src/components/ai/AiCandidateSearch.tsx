import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { FiX, FiZap } from "react-icons/fi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useSearchCandidatesMutation } from "../../api/aiApi";
import { aiErrorMessage } from "../../lib/aiErrors";
import { formatExperience } from "../../lib/format";
import { Button } from "../ui/Button";
import { SkillChips } from "../ui/SkillChips";
import type { CandidateSearchResult } from "../../types";

function interpretationChips(result: CandidateSearchResult): string[] {
  const { interpretation: i } = result;
  return [
    ...i.skills.map((s) => `skill: ${s}`),
    ...(i.location ? [`location: ${i.location}`] : []),
    ...(i.minExperience !== undefined ? [`experience ≥ ${i.minExperience} yrs`] : []),
    ...(i.maxExperience !== undefined ? [`experience ≤ ${i.maxExperience} yrs`] : []),
    ...(i.nameContains ? [`name contains: ${i.nameContains}`] : []),
  ];
}

/**
 * Ask for candidates in plain English. The AI only turns the sentence into
 * filters (shown back to you); the search itself is the normal exact-skill,
 * tenant-scoped database query. Hidden when the server has no AI key.
 */
export function AiCandidateSearch() {
  const { data: features } = useGetFeaturesQuery();
  const [search, { isLoading }] = useSearchCandidatesMutation();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CandidateSearchResult>();
  const [error, setError] = useState<string>();

  if (!features?.ai) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      setResult(await search({ query }).unwrap());
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  const chips = result ? interpretationChips(result) : [];

  return (
    <div className="rounded-md border border-brand-100 bg-brand-50/40 p-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="ai-search" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-700">
          <FiZap className="h-4 w-4 text-brand-500" aria-hidden="true" />
          Ask AI
        </label>
        <input
          id="ai-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={300}
          placeholder="e.g. react developers in Bangalore with 5+ years of experience"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
        />
        <Button type="submit" disabled={isLoading || query.trim().length < 3}>
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>Understood as:</span>
              {chips.length === 0 && <span className="italic">no filters (showing the most experienced)</span>}
              {chips.map((chip) => (
                <span key={chip} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium capitalize text-slate-700">
                  {chip}
                </span>
              ))}
            </div>
            <button
              type="button"
              aria-label="Clear AI search results"
              onClick={() => setResult(undefined)}
              className="text-slate-400 hover:text-slate-600"
            >
              <FiX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {result.unknownSkills.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-600">
              Not in the skill list, so not used as a filter: {result.unknownSkills.join(", ")}.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {result.total} candidate{result.total === 1 ? "" : "s"} match{result.total === 1 ? "es" : ""}
            {result.total > result.items.length ? ` (showing the first ${result.items.length})` : ""}.
          </p>
          <ul className="mt-1">
            {result.items.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 border-b border-slate-100 py-2 last:border-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link to={`/candidates/${c.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
                    {c.fullName}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {c.location || "Location not set"} · {formatExperience(c.experienceYears)}
                  </span>
                </div>
                <SkillChips skills={c.skills.map((s) => s.skill.name)} max={6} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
