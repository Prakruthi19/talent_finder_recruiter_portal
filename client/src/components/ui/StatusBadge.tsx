const STATUS_CLASSES: Record<string, string> = {
  OPEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  HIRED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-300 bg-slate-100 text-slate-600",
  INACTIVE: "border-slate-300 bg-slate-100 text-slate-600",
  SHORTLISTED: "border-amber-200 bg-amber-50 text-amber-700",
  SUBMITTED_TO_CLIENT: "border-blue-200 bg-blue-50 text-blue-700",
  INTERVIEWING: "border-indigo-200 bg-indigo-50 text-indigo-700",
  OFFERED: "border-violet-200 bg-violet-50 text-violet-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  SCHEDULED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NO_SHOW: "border-red-200 bg-red-50 text-red-700",
};

const DOT_CLASSES: Record<string, string> = {
  OPEN: "bg-emerald-500",
  ACTIVE: "bg-emerald-500",
  HIRED: "bg-emerald-500",
  CLOSED: "bg-slate-400",
  INACTIVE: "bg-slate-400",
  SHORTLISTED: "bg-amber-500",
  SUBMITTED_TO_CLIENT: "bg-blue-500",
  INTERVIEWING: "bg-indigo-500",
  OFFERED: "bg-violet-500",
  REJECTED: "bg-red-500",
  SCHEDULED: "bg-indigo-500",
  COMPLETED: "bg-emerald-500",
  NO_SHOW: "bg-red-500",
};

function toLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-semibold ${
        STATUS_CLASSES[status] ?? "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status] ?? "bg-slate-400"}`}
        aria-hidden="true"
      />
      {toLabel(status)}
    </span>
  );
}
