import { FiLogOut } from "react-icons/fi";
import { useGetMeQuery } from "../../api/authApi";
import { useCurrentRole, useLogout } from "../../hooks/useAuth";

export function Header() {
  const { data: me } = useGetMeQuery();
  const role = useCurrentRole();
  const logout = useLogout();
  const initials = (me?.user.name ?? "?")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

      <div className="flex items-center gap-3">
        {me && (
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-slate-900">{me.user.name}</div>
            <div className="text-xs text-slate-500">
              {me.user.email}
              {role && (
                <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {role}
                </span>
              )}
            </div>
          </div>
        )}
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-600"
        >
          {initials}
        </span>
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <FiLogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
