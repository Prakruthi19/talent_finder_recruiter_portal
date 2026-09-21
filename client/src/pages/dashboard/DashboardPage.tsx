import { useState } from "react";
import { Link } from "react-router-dom";
import { FiZap } from "react-icons/fi";
import { useGetDashboardQuery } from "../../api/dashboardApi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useDashboardBriefMutation } from "../../api/aiApi";
import { useAppSelector } from "../../store/hooks";
import { aiErrorMessage } from "../../lib/aiErrors";
import { TenantSelect } from "../../components/ui/TenantSelect";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";
import type { DashboardOverview } from "../../types";

const statusLabel = (status: string) => {
  const text = status.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const card = "rounded-md border border-slate-200 bg-white p-4 shadow-sm";

function SkillDemandCard({ gaps }: { gaps: DashboardOverview["skillGaps"] }) {
  // One shared scale, so a bar's length means the same thing on every row.
  const max = Math.max(1, ...gaps.flatMap((g) => [g.demand, g.supply]));
  return (
    <section className={card} aria-labelledby="gaps-title">
      <h2 id="gaps-title" className="text-base font-semibold text-slate-900">Skills in demand</h2>
      <p className="mb-3 text-xs text-slate-500">
        What your open roles need, against the candidates you have. Scarcest first.
      </p>
      {gaps.length === 0 ? (
        <EmptyState label="No open job orders yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {gaps.map((g) => (
            <li key={g.skill}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize text-slate-800">{g.skill}</span>
                {g.supply <= g.demand && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Scarce
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-col gap-1" aria-hidden="true">
                <div className="h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-brand-500" style={{ width: `${(g.demand / max) * 100}%` }} /></div>
                <div className="h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-emerald-500" style={{ width: `${(g.supply / max) * 100}%` }} /></div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                <span className="text-brand-700">{g.demand} open role{g.demand === 1 ? "" : "s"}</span> need it ·{" "}
                <span className="text-emerald-700">{g.supply} candidate{g.supply === 1 ? "" : "s"}</span> have it
              </p>
            </li>
          ))}
        </ul>
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
            <SkillDemandCard gaps={data.skillGaps} />

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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.pipeline.map((p) => (
                      <span key={p.status} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{p.count}</span> {statusLabel(p.status)}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <AiBrief />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
