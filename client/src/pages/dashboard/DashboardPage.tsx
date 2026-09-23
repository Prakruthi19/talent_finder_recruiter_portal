import { useState } from "react";
import { Link } from "react-router-dom";
import { FiZap, FiCopy, FiMail } from "react-icons/fi";
import { useGetDashboardQuery } from "../../api/dashboardApi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useDashboardBriefMutation, useRecommendShortlistMutation, useDraftFollowUpMutation } from "../../api/aiApi";
import { useShortlistCandidateMutation } from "../../api/jobOrdersApi";
import { useAppSelector } from "../../store/hooks";
import { aiErrorMessage } from "../../lib/aiErrors";
import { TenantSelect } from "../../components/ui/TenantSelect";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";
import type { DashboardOverview, OutreachDraft, RecommendedPick } from "../../types";

const statusLabel = (status: string) => {
  const text = status.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Ordinal stage order: position carries meaning (further along the pipeline), so
// it's one hue getting darker, not a categorical palette — HIRED/REJECTED are
// terminal outcomes, not "further along," so they get the app's own status
// colors (StatusBadge) instead of continuing the ramp. Steps validated with
// dataviz's ordinal check (node scripts/validate_palette.js --ordinal): brand
// 400/500/700/900 is the widest-spaced 4-step run this ramp supports cleanly.
const PIPELINE_STAGES: { status: string; barClass: string }[] = [
  { status: "SHORTLISTED", barClass: "bg-brand-400" },
  { status: "SUBMITTED_TO_CLIENT", barClass: "bg-brand-500" },
  { status: "INTERVIEWING", barClass: "bg-brand-700" },
  { status: "OFFERED", barClass: "bg-brand-900" },
];

function PipelineChart({ pipeline }: { pipeline: DashboardOverview["pipeline"] }) {
  const counts = new Map(pipeline.map((p) => [p.status, p.count]));
  const stageCounts = PIPELINE_STAGES.map((s) => counts.get(s.status) ?? 0);
  const max = Math.max(1, ...stageCounts);
  const hired = counts.get("HIRED") ?? 0;
  const rejected = counts.get("REJECTED") ?? 0;

  return (
    <div className="mt-2 flex flex-col gap-2.5">
      {PIPELINE_STAGES.map((s, i) => {
        const count = stageCounts[i] ?? 0;
        return (
          <div key={s.status}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{statusLabel(s.status)}</span>
              <span className="text-slate-500">{count}</span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-md bg-slate-100">
              <div
                className={`h-6 rounded-r-[4px] transition-[width] ${s.barClass}`}
                style={{ width: `${(count / max) * 100}%` }}
                title={`${statusLabel(s.status)}: ${count}`}
              />
            </div>
          </div>
        );
      })}
      {(hired > 0 || rejected > 0) && (
        <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2.5">
          {hired > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge status="HIRED" />
              <span className="text-xs text-slate-500">×{hired}</span>
            </span>
          )}
          {rejected > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge status="REJECTED" />
              <span className="text-xs text-slate-500">×{rejected}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function formatWeekLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A single measure (new submissions) over time -> one series, one hue (brand-600),
 * no legend needed (the title says what's plotted). Line + a light area wash,
 * per-point hover title, direct label only on the last point (the one the
 * story is about) rather than a number on every point.
 */
function TrendChart({ trend }: { trend: DashboardOverview["submissionsTrend"] }) {
  const total = trend.reduce((sum, t) => sum + t.count, 0);
  if (total === 0) return <EmptyState label="No submissions yet in the last 8 weeks." />;

  const chartWidth = 280;
  const chartHeight = 64;
  const padX = 12;
  const padTop = 10;
  const max = Math.max(1, ...trend.map((t) => t.count));
  const n = trend.length;

  const points = trend.map((t, i) => ({
    x: padX + (n === 1 ? chartWidth / 2 : (i / (n - 1)) * chartWidth),
    y: padTop + (1 - t.count / max) * (chartHeight - padTop),
    count: t.count,
    weekStart: t.weekStart,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${chartHeight + padTop} L ${first.x.toFixed(1)} ${chartHeight + padTop} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartWidth + padX * 2} ${chartHeight + padTop + 4}`}
        className="w-full text-brand-600"
        role="img"
        aria-label={`Submissions per week for the last ${n} weeks, ending at ${last.count} this week`}
      >
        <path d={areaPath} fill="currentColor" fillOpacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.weekStart} cx={p.x} cy={p.y} r={3} className="fill-brand-600 stroke-white" strokeWidth={2}>
            <title>{`Week of ${formatWeekLabel(p.weekStart)}: ${p.count} submission${p.count === 1 ? "" : "s"}`}</title>
          </circle>
        ))}
        <text x={last.x} y={Math.max(9, last.y - 8)} textAnchor="end" className="fill-slate-700 text-[10px] font-semibold">
          {last.count}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{formatWeekLabel(first.weekStart)}</span>
        <span>{formatWeekLabel(last.weekStart)}</span>
      </div>
    </div>
  );
}

const card = "rounded-md border border-slate-200 bg-white p-4 shadow-sm";
const linkButton =
  "inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50";

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

/** Draft + copy block shared by the stale-submission nudge and (later) interview messages. */
function DraftBlock({ draft }: { draft: OutreachDraft }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
    } catch {
      // Clipboard permission denied or unavailable — the text is still on screen to select by hand.
    }
  }
  return (
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
  );
}

/**
 * Matching stays deterministic (dashboardRepository.topUnshortlistedPairing picks the highest
 * exact-match, not-yet-shortlisted pairing); the AI only writes the one-line reason.
 */
function RecommendedShortlistCard() {
  const { data: features } = useGetFeaturesQuery();
  const [suggest, { isLoading }] = useRecommendShortlistMutation();
  const [shortlist, { isLoading: isShortlisting }] = useShortlistCandidateMutation();
  const [pick, setPick] = useState<RecommendedPick | null>();
  const [error, setError] = useState<string>();

  if (!features?.ai) return null;

  async function handleSuggest() {
    setError(undefined);
    try {
      setPick((await suggest().unwrap()).pick);
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  async function handleShortlist() {
    if (!pick) return;
    setError(undefined);
    try {
      await shortlist({ jobOrderId: pick.jobOrderId, candidateId: pick.candidateId }).unwrap();
      setPick(undefined);
    } catch {
      setError("Couldn't shortlist this candidate — they may already be shortlisted.");
    }
  }

  return (
    <section className={card} aria-labelledby="recommend-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recommend-title" className="text-base font-semibold text-slate-900">Recommended next shortlist</h2>
        <button type="button" onClick={handleSuggest} disabled={isLoading} className={linkButton}>
          <FiZap className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Thinking..." : pick ? "Suggest another" : "Suggest a pick"}
        </button>
      </div>
      <p className="mb-1 text-xs text-slate-500">
        The strongest not-yet-shortlisted match for an open role, ranked by exact skill match.
      </p>
      {pick === null && <EmptyState label="No open, unshortlisted matches right now." />}
      {pick && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-sm font-medium text-slate-900">
            {pick.candidateName} <span className="font-normal text-slate-500">for</span> {pick.jobOrderTitle}
          </p>
          <p className="mt-1 text-xs text-slate-600">{pick.reason}</p>
          <p className="mt-1 text-xs text-slate-400">
            {pick.matchCount} matched skill{pick.matchCount === 1 ? "" : "s"}
          </p>
          <Button variant="secondary" className="mt-2" disabled={isShortlisting} onClick={handleShortlist}>
            {isShortlisting ? "Shortlisting..." : "Shortlist"}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

/** Finding the stale submission is free (part of the dashboard query); drafting the follow-up is the paid, click-triggered step. */
function StaleSubmissionCard({ submission }: { submission: DashboardOverview["staleSubmission"] }) {
  const { data: features } = useGetFeaturesQuery();
  const [draftFollowUp, { isLoading }] = useDraftFollowUpMutation();
  const [draft, setDraft] = useState<OutreachDraft>();
  const [error, setError] = useState<string>();

  async function handleDraft() {
    if (!submission) return;
    setError(undefined);
    try {
      setDraft(await draftFollowUp({ jobOrderId: submission.jobOrderId, candidateId: submission.candidateId }).unwrap());
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  return (
    <section className={card} aria-labelledby="stale-title">
      <h2 id="stale-title" className="text-base font-semibold text-slate-900">Going quiet</h2>
      <p className="mb-2 text-xs text-slate-500">The longest-untouched submission still in progress (7+ days, no status change).</p>
      {!submission ? (
        <EmptyState label="Nothing's gone quiet — every active submission has moved recently." />
      ) : (
        <div>
          <p className="text-sm font-medium text-slate-900">
            <Link to={`/candidates/${submission.candidateId}`} className="hover:text-brand-700 hover:underline">
              {submission.candidate?.fullName}
            </Link>{" "}
            <span className="font-normal text-slate-500">for</span>{" "}
            <Link to={`/job-orders/${submission.jobOrderId}`} className="hover:text-brand-700 hover:underline">
              {submission.jobOrder?.title}
            </Link>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Still {statusLabel(submission.status).toLowerCase()} · last moved {daysAgo(submission.updatedAt)} days ago
          </p>
          {features?.ai && (
            <button type="button" onClick={handleDraft} disabled={isLoading} className={`${linkButton} mt-2`}>
              <FiMail className="h-3.5 w-3.5" aria-hidden="true" />
              {isLoading ? "Drafting..." : draft ? "Redraft follow-up" : "Draft follow-up"}
            </button>
          )}
          {draft && <DraftBlock draft={draft} />}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}

function AiBrief() {
  const { data: features } = useGetFeaturesQuery();
  const [generate, { isLoading }] = useDashboardBriefMutation();
  const [brief, setBrief] = useState<string>();
  const [error, setError] = useState<string>();

  if (!features?.ai) return null;

  async function handleClick() {
    setError(undefined);
    try {
      setBrief((await generate().unwrap()).brief);
    } catch (err) {
      setError(aiErrorMessage(err));
    }
  }

  return (
    <section className={card} aria-labelledby="brief-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="brief-title" className="text-base font-semibold text-slate-900">AI brief</h2>
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
        >
          <FiZap className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? "Writing..." : brief ? "Regenerate" : "Generate brief"}
        </button>
      </div>
      <p className="text-xs text-slate-500">A short read on where things stand, from the numbers on this page only (no candidate details are sent).</p>
      {brief && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{brief}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

export function DashboardPage() {
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  // Fresh on every visit: nearly any action elsewhere changes these numbers.
  const { data, isLoading, isError } = useGetDashboardQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId, refetchOnMountOrArgChange: true }
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <TenantSelect />
      </div>

      {!tenantId ? (
        <EmptyState label="Select a tenant to see its dashboard." />
      ) : isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            <SummaryCard label="Candidates" value={data.totals.candidates} />
            <SummaryCard label="Added this week" value={data.totals.addedThisWeek} />
            <SummaryCard label="Open job orders" value={data.totals.openJobOrders} />
            <SummaryCard label="Open positions" value={data.totals.openings} />
            <SummaryCard label="Submissions" value={data.totals.submissions} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <RecommendedShortlistCard />
              <StaleSubmissionCard submission={data.staleSubmission} />
            </div>

            <div className="flex flex-col gap-3">
              <section className={card} aria-labelledby="roles-title">
                <h2 id="roles-title" className="text-base font-semibold text-slate-900">Roles needing attention</h2>
                <p className="mb-2 text-xs text-slate-500">Open roles with the fewest candidates who share any required skill.</p>
                {data.rolesNeedingAttention.length === 0 ? (
                  <EmptyState label="No open job orders." />
                ) : (
                  <ul>
                    {data.rolesNeedingAttention.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
                        <Link to={`/job-orders/${r.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
                          {r.title}
                        </Link>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {r.candidates} matching · {r.shortlisted} shortlisted · {r.openings} opening{r.openings === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={card} aria-labelledby="pipeline-title">
                <h2 id="pipeline-title" className="text-base font-semibold text-slate-900">Submission pipeline</h2>
                {data.pipeline.length === 0 ? (
                  <EmptyState label="No submissions yet. Shortlist a candidate from a job order." />
                ) : (
                  <PipelineChart pipeline={data.pipeline} />
                )}
              </section>

              <AiBrief />
            </div>
          </div>

          <section className={card} aria-labelledby="trend-title">
            <h2 id="trend-title" className="text-base font-semibold text-slate-900">Submissions trend</h2>
            <p className="mb-2 text-xs text-slate-500">New submissions per week, last 8 weeks.</p>
            <TrendChart trend={data.submissionsTrend} />
          </section>
        </>
      )}
    </div>
  );
}
