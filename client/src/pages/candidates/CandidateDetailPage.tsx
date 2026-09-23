import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiTrash2, FiDownload } from "react-icons/fi";
import { useGetCandidateQuery, useDeleteCandidateMutation } from "../../api/candidatesApi";
import { useGetCandidateNotesQuery, useAddCandidateNoteMutation } from "../../api/notesApi";
import { NotesPanel } from "../../components/notes/NotesPanel";
import { useCurrentRole } from "../../hooks/useAuth";
import { authHeaders } from "../../lib/authHeaders";
import { API_BASE_URL } from "../../api/baseApi";
import { Button } from "../../components/ui/Button";
import { SkillChips } from "../../components/ui/SkillChips";
import { CandidateAiSummary } from "../../components/ai/CandidateAiSummary";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingState, ErrorState } from "../../components/ui/PageStates";
import { formatExperience, formatDate } from "../../lib/format";

// A plain <a href> can't send the login token, so the file is fetched with it and saved from a blob.
async function downloadCv(candidateId: string, fileName: string) {
  const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/cv`, {
    headers: authHeaders(),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useCurrentRole() === "ADMIN";
  const { data: candidate, isLoading, isError } = useGetCandidateQuery(id!);
  const [deleteCandidate] = useDeleteCandidateMutation();
  const { data: notes, isLoading: notesLoading } = useGetCandidateNotesQuery(id!, { skip: !id });
  const [addNote] = useAddCandidateNoteMutation();

  async function handleDelete() {
    if (!candidate) return;
    if (!window.confirm(`Delete candidate "${candidate.fullName}"? This cannot be undone.`)) return;
    await deleteCandidate(candidate.id).unwrap();
    navigate("/candidates");
  }

  if (isLoading) return <LoadingState />;
  if (isError || !candidate) return <ErrorState label="Candidate not found." />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate("/candidates")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Candidates
      </button>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{candidate.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {candidate.location || "Location not set"} · {formatExperience(candidate.experienceYears)} experience
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {candidate.email || "No email"} {candidate.phone ? `· ${candidate.phone}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Edit candidate"
              onClick={() => navigate(`/candidates/${candidate.id}/edit`)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <FiEdit2 className="h-4 w-4" aria-hidden="true" />
            </button>
            {isAdmin && (
              <button
                type="button"
                aria-label="Delete candidate"
                onClick={handleDelete}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
              >
                <FiTrash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Skills</h2>
          <SkillChips skills={candidate.skills.map((s) => s.skill.name)} />
        </div>

        <CandidateAiSummary candidateId={candidate.id} />

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">CV</h2>
          {/* cvPath (the server's disk path) is never sent to the client; a CV's presence
              is just whether it has an original filename. */}
          {candidate.cvOriginalName ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadCv(candidate.id, candidate.cvOriginalName!)}
            >
              <FiDownload className="h-4 w-4" aria-hidden="true" />
              Download {candidate.cvOriginalName}
            </Button>
          ) : (
            <p className="text-sm text-slate-400">No CV uploaded.</p>
          )}
        </div>

        <p className="mt-5 text-xs text-slate-400">Added {formatDate(candidate.createdAt)}</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Shortlisted Job Orders</h2>
        {candidate.submissions.length === 0 ? (
          <p className="text-sm text-slate-400">Not shortlisted for any job orders yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {candidate.submissions.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between py-3">
                <Link
                  to={`/job-orders/${sub.jobOrderId}`}
                  className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline"
                >
                  {sub.jobOrder?.title ?? "Job Order"}
                </Link>
                <StatusBadge status={sub.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <NotesPanel notes={notes} isLoading={notesLoading} onAdd={(body) => addNote({ candidateId: candidate.id, body }).unwrap()} />
    </div>
  );
}
