import { useState } from "react";
import { FiCopy, FiHelpCircle, FiMail } from "react-icons/fi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useDraftOutreachMutation, useInterviewQuestionsMutation } from "../../api/aiApi";
import { aiErrorMessage } from "../../lib/aiErrors";
import type { OutreachDraft } from "../../types";

const linkButton =
  "inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50";

function OutreachDraftPanel({ jobOrderId, candidateId }: { jobOrderId: string; candidateId: string }) {
  const [draftOutreach, { isLoading }] = useDraftOutreachMutation();
  const [tone, setTone] = useState<"friendly" | "formal">("friendly");
  const [draft, setDraft] = useState<OutreachDraft>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError(undefined);
    setCopied(false);
    try {
      setDraft(await draftOutreach({ jobOrderId, candidateId, tone }).unwrap());
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the text and copy it by hand.");
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={generate} disabled={isLoading} className={linkButton}>
          <FiMail className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Drafting..." : draft ? "Redraft outreach" : "Draft outreach"}
        </button>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <span className="sr-only">Tone</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as "friendly" | "formal")}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700"
          >
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
          </select>
        </label>
      </div>
      {draft && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-700">Subject: {draft.subject}</p>
          <p className="mt-1.5 whitespace-pre-line text-xs text-slate-700">{draft.body}</p>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={copy} className={linkButton}>
              <FiCopy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
            <span className="text-xs text-slate-400">A draft only. Nothing is sent from here.</span>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function InterviewQuestionsPanel({ jobOrderId, candidateId }: { jobOrderId: string; candidateId: string }) {
  const [getQuestions, { isLoading }] = useInterviewQuestionsMutation();
  const [questions, setQuestions] = useState<string[]>();
  const [error, setError] = useState<string>();

  async function generate() {
    setError(undefined);
    try {
      setQuestions((await getQuestions({ jobOrderId, candidateId }).unwrap()).questions);
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={generate} disabled={isLoading} className={linkButton}>
        <FiHelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {isLoading ? "Thinking..." : questions ? "Regenerate questions" : "Interview questions"}
      </button>
      {questions && (
        <ol className="mt-2 list-decimal space-y-1 rounded-md border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-xs text-slate-700">
          {questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Outreach draft + interview questions for one candidate against one job order. Hidden when the server has no AI key. */
export function MatchAiActions({ jobOrderId, candidateId }: { jobOrderId: string; candidateId: string }) {
  const { data: features } = useGetFeaturesQuery();
  if (!features?.ai) return null;
  return (
    <>
      <OutreachDraftPanel jobOrderId={jobOrderId} candidateId={candidateId} />
      <InterviewQuestionsPanel jobOrderId={jobOrderId} candidateId={candidateId} />
    </>
  );
}
