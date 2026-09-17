import { NavLink } from "react-router-dom";
import { FiGrid, FiUsers, FiBriefcase, FiFileText } from "react-icons/fi";
import type { IconType } from "react-icons";

const NAV_ITEMS: { to: string; label: string; icon: IconType }[] = [
  { to: "/tenants", label: "Tenant", icon: FiGrid },
  { to: "/candidates", label: "Candidate", icon: FiUsers },
  { to: "/job-orders", label: "Job Order", icon: FiBriefcase },
  { to: "/submissions", label: "Submission", icon: FiFileText },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-800 bg-slate-900 pt-16 sm:flex">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-500 bg-slate-800 text-white"
                  : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
