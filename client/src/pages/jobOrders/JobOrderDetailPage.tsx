import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiTrash2, FiCheckCircle } from "react-icons/fi";
import {
  useGetJobOrderMatchesQuery,
  useShortlistCandidateMutation,
  useDeleteJobOrderMutation,
} from "../../api/jobOrdersApi";
import { Button } from "../../components/ui/Button";
import { SkillChips } from "../../components/ui/SkillChips";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/PageStates";
import { formatExperience } from "../../lib/format";
import type { MatchingCandidateRow } from "../../types";

function MatchRow({
  row,
  onShortlist,
  isShortlisting,
}: {
  row: MatchingCandidateRow;
  onShortlist: (candidateId: string) => void;
  isShortlisting: boolean;
}) {
  const matchedSet = new Set(row.matchedSkillNames.map((s) => s.toLowerCase()));
  return (
    <li className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <Link
          to={`/candidates/${row.candidate.id}`}
          className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
        >
          {row.candidate.fullName}
        </Link>
        <p className="text-xs text-slate-500">
          {row.candidate.location || "Location not set"} · {formatExperience(row.candidate.experienceYears)}
        </p>
        <div className="mt-2">
          <SkillChips skills={row.candidate.skills.map((s) => s.skill.name)} highlight={matchedSet} />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <span className="text-sm font-semibold text-brand-700">
          {row.matchCount} skill{row.matchCount === 1 ? "" : "s"} matched
        </span>
        {row.shortlisted ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
            Shortlisted
          </span>
        ) : (
          <Button
            variant="secondary"
            disabled={isShortlisting}
            onClick={() => onShortlist(row.candidate.id)}
          >
            Shortlist
          </Button>
        )}
      </div>
    </li>
  );
}

export function JobOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetJobOrderMatchesQuery(id!);
  const [shortlist, { isLoading: isShortlisting }] = useShortlistCandidateMutation();
  const [deleteJobOrder] = useDeleteJobOrderMutation();

  async function handleShortlist(candidateId: string) {
    if (!id) return;
    try {
      await shortlist({ jobOrderId: id, candidateId }).unwrap();
    } catch {
      // Conflict (already shortlisted) or validation error — UI stays consistent via refetch.
    }
  }

  async function handleDelete() {
    if (!data) return;
    if (!window.confirm(`Delete job order "${data.jobOrder.title}"? This cannot be undone.`)) return;
    await deleteJobOrder(data.jobOrder.id).unwrap();
    navigate("/job-orders");
  }

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState label="Job order not found." />;

  const { jobOrder, matchingCandidates, shortlistedCandidates } = data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate("/job-orders")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Job Orders
      </button>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{jobOrder.title}</h1>
              <StatusBadge status={jobOrder.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {jobOrder.clientName ? `${jobOrder.clientName} · ` : ""}
              {jobOrder.location} · Min {formatExperience(jobOrder.minExperience)} ·{" "}
              {jobOrder.numberOfOpenings} opening{jobOrder.numberOfOpenings === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Edit job order"
              onClick={() => navigate(`/job-orders/${jobOrder.id}/edit`)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              <FiEdit2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Delete job order"
              onClick={handleDelete}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
            >
              <FiTrash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Required Skills</h2>
          <SkillChips skills={jobOrder.requiredSkills.map((s) => s.skill.name)} />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Matching Candidates</h2>
        <p className="mb-4 text-sm text-slate-500">
          Ranked by number of required skills matched, highest first.
        </p>
        {matchingCandidates.length === 0 ? (
          <EmptyState label="No candidates in this tenant match the required skills yet." />
        ) : (
          <ul>
            {matchingCandidates.map((row) => (
              <MatchRow
                key={row.candidate.id}
                row={row}
                onShortlist={handleShortlist}
                isShortlisting={isShortlisting}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Shortlisted Candidates</h2>
        {shortlistedCandidates.length === 0 ? (
          <p className="text-sm text-slate-400">No candidates shortlisted yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {shortlistedCandidates.map((row) => (
              <li key={row.candidate.id} className="flex items-center justify-between py-3">
                <Link
                  to={`/candidates/${row.candidate.id}`}
                  className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline"
                >
                  {row.candidate.fullName}
                </Link>
                <StatusBadge status={row.submissionStatus ?? "SHORTLISTED"} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
