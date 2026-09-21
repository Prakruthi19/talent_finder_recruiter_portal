import { NavLink } from "react-router-dom";
import { FiGrid, FiUsers, FiBriefcase, FiFileText, FiHome, FiActivity } from "react-icons/fi";
import type { IconType } from "react-icons";
import { useCurrentRole } from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: FiHome },
  { to: "/tenants", label: "Tenant", icon: FiGrid },
  { to: "/candidates", label: "Candidate", icon: FiUsers },
  { to: "/job-orders", label: "Job Order", icon: FiBriefcase },
  { to: "/submissions", label: "Submission", icon: FiFileText },
];

// The activity log names people and what they did, so only admins are offered it.
const ADMIN_ITEMS: NavItem[] = [{ to: "/activity", label: "Activity", icon: FiActivity }];

export function Sidebar() {
  const role = useCurrentRole();
  const items = role === "ADMIN" ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-800 bg-slate-900 pt-16 sm:flex">
      <nav className="flex flex-col gap-0.5 p-3">
        {items.map((item) => (
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
