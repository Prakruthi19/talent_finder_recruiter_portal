import { FormEvent, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiCopy, FiMail } from "react-icons/fi";
import { useGetSubmissionQuery } from "../../api/submissionsApi";
import { useScheduleInterviewMutation, useUpdateInterviewMutation } from "../../api/interviewsApi";
import { useDraftInterviewMessageMutation } from "../../api/aiApi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useGetSubmissionNotesQuery, useAddSubmissionNoteMutation } from "../../api/notesApi";
import { aiErrorMessage } from "../../lib/aiErrors";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/PageStates";
import { FormField } from "../../components/forms/FormField";
import { NotesPanel } from "../../components/notes/NotesPanel";
import { formatDateTime } from "../../lib/format";
import type { Interview, InterviewMode, OutreachDraft } from "../../types";

const linkButton =
  "inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50";

const MODE_LABEL: Record<InterviewMode, string> = { PHONE: "Phone", VIDEO: "Video", ONSITE: "Onsite" };

/** Draft + copy for one interview round. A draft only — nothing is sent, no calendar involved. */
function InterviewMessagePanel({ interviewId }: { interviewId: string }) {
  const [draftMessage, { isLoading }] = useDraftInterviewMessageMutation();
  const [draft, setDraft] = useState<OutreachDraft>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  async function generate(kind: "confirmation" | "reminder") {
    setError(undefined);
    setCopied(false);
    try {
      setDraft(await draftMessage({ interviewId, kind }).unwrap());
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
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => generate("confirmation")} disabled={isLoading} className={linkButton}>
          <FiMail className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Drafting..." : "Draft confirmation"}
        </button>
        <button type="button" onClick={() => generate("reminder")} disabled={isLoading} className={linkButton}>
          <FiMail className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Drafting..." : "Draft reminder"}
        </button>
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

function InterviewRow({ interview, submissionId }: { interview: Interview; submissionId: string }) {
  const { data: features } = useGetFeaturesQuery();
  const [updateInterview, { isLoading }] = useUpdateInterviewMutation();

  async function setStatus(status: "COMPLETED" | "CANCELLED" | "NO_SHOW") {
    await updateInterview({ id: interview.id, submissionId, body: { status } }).unwrap();
  }

  return (
    <li className="border-b border-slate-100 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">
          Round {interview.round} · {MODE_LABEL[interview.mode]}
        </p>
        <StatusBadge status={interview.status} />
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(interview.scheduledAt)}</p>
      {interview.notes && <p className="mt-1 text-xs text-slate-500">{interview.notes}</p>}

      {interview.status === "SCHEDULED" && (
        <div className="mt-2 flex flex-wrap gap-3">
          <button type="button" disabled={isLoading} onClick={() => setStatus("COMPLETED")} className={linkButton}>
            Mark completed
          </button>
          <button type="button" disabled={isLoading} onClick={() => setStatus("NO_SHOW")} className={linkButton}>
            No-show
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setStatus("CANCELLED")}
            className={`${linkButton} text-red-600 hover:text-red-800`}
          >
            Cancel
          </button>
        </div>
      )}

      {features?.ai && <InterviewMessagePanel interviewId={interview.id} />}
    </li>
  );
}

function ScheduleInterviewForm({ submissionId }: { submissionId: string }) {
  const [scheduleInterview, { isLoading }] = useScheduleInterviewMutation();
  const [scheduledAt, setScheduledAt] = useState("");
  const [mode, setMode] = useState<InterviewMode>("VIDEO");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!scheduledAt) {
      setError("Pick a date and time");
      return;
    }
    setError(undefined);
    try {
      await scheduleInterview({
        submissionId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        mode,
        notes: notes.trim() || undefined,
      }).unwrap();
      setScheduledAt("");
      setNotes("");
    } catch {
      setError("Couldn't schedule the interview.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Date and time"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="interview-mode" className="text-sm font-medium text-slate-700">Mode</label>
          <select
            id="interview-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as InterviewMode)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="VIDEO">Video</option>
            <option value="PHONE">Phone</option>
            <option value="ONSITE">Onsite</option>
          </select>
        </div>
      </div>
      <FormField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <Button type="submit" variant="secondary" disabled={isLoading}>
          {isLoading ? "Scheduling..." : "Schedule Interview"}
        </Button>
      </div>
    </form>
  );
}

export function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading, isError } = useGetSubmissionQuery(id!);
  const { data: notes, isLoading: notesLoading } = useGetSubmissionNotesQuery(id!, { skip: !id });
  const [addNote] = useAddSubmissionNoteMutation();

  if (isLoading) return <LoadingState />;
  if (isError || !submission) return <ErrorState label="Submission not found." />;

  const interviews = submission.interviews ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate("/submissions")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Submissions
      </button>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">
            <Link to={`/candidates/${submission.candidateId}`} className="hover:text-brand-700 hover:underline">
              {submission.candidate?.fullName ?? "—"}
            </Link>
            <span className="mx-2 font-normal text-slate-400">for</span>
            <Link to={`/job-orders/${submission.jobOrderId}`} className="hover:text-brand-700 hover:underline">
              {submission.jobOrder?.title ?? "—"}
            </Link>
          </h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Shortlisted {formatDateTime(submission.createdAt)} · {submission.matchCount} matched skill
          {submission.matchCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Interview rounds</h2>
        {interviews.length === 0 ? (
          <EmptyState label="No interviews scheduled yet." />
        ) : (
          <ul className="mt-2">
            {interviews.map((interview) => (
              <InterviewRow key={interview.id} interview={interview} submissionId={submission.id} />
            ))}
          </ul>
        )}
        <ScheduleInterviewForm submissionId={submission.id} />
      </div>

      <NotesPanel
        notes={notes}
        isLoading={notesLoading}
        onAdd={(body) => addNote({ submissionId: submission.id, body }).unwrap()}
      />
    </div>
  );
}
