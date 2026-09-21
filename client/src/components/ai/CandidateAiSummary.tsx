import { useState } from "react";
import { FiZap } from "react-icons/fi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useSummarizeCandidateMutation } from "../../api/aiApi";
import { aiErrorMessage } from "../../lib/aiErrors";

/** An on-demand, neutral summary of one candidate. Their name and contact details are removed before anything is sent. */
export function CandidateAiSummary({ candidateId }: { candidateId: string }) {
  const { data: features } = useGetFeaturesQuery();
  const [summarize, { isLoading }] = useSummarizeCandidateMutation();
  const [result, setResult] = useState<{ summary: string; usedCv: boolean }>();
  const [error, setError] = useState<string>();

  if (!features?.ai) return null;

  async function handleClick() {
    setError(undefined);
    try {
      setResult(await summarize(candidateId).unwrap());
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">AI Summary</h2>
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
        >
          <FiZap className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Writing summary..." : result ? "Regenerate" : "Generate AI summary"}
        </button>
      </div>
      {result && (
        <div className="rounded-md border border-brand-100 bg-brand-50/60 px-3 py-2.5">
          <p className="whitespace-pre-line text-sm text-slate-700">{result.summary}</p>
          <p className="mt-2 text-xs text-slate-400">
            {result.usedCv ? "Based on the profile and the uploaded CV" : "Based on the profile fields"}. The name and
            contact details were removed before it was sent to the AI provider.
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
