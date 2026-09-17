export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-slate-500">{label}</div>;
}

export function ErrorState({ label = "Something went wrong." }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-red-600">{label}</div>;
}

export function EmptyState({ label = "Nothing here yet." }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-slate-400">{label}</div>;
}
