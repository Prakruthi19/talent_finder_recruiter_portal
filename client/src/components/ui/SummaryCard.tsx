interface Props {
  label: string;
  value: number | string;
}

export function SummaryCard({ label, value }: Props) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
