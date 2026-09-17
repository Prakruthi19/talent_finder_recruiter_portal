import { FiUser } from "react-icons/fi";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-sm font-bold tracking-tight text-white">
          TF
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Talent Finder
        </span>
      </div>
      <button
        type="button"
        aria-label="User account"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
      >
        <FiUser className="h-4 w-4" aria-hidden="true" />
      </button>
    </header>
  );
}
