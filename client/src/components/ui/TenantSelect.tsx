import { useEffect } from "react";
import { FiGrid } from "react-icons/fi";
import { useGetTenantsQuery } from "../../api/tenantsApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setSelectedTenant } from "../../store/tenantSlice";

export function TenantSelect() {
  const dispatch = useAppDispatch();
  const selectedTenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  // The server only returns the tenants this user belongs to.
  const { data } = useGetTenantsQuery({ pageSize: 100 });

  useEffect(() => {
    if (!data?.items.length) return;
    // Nothing selected, or the remembered tenant isn't one of this user's (a
    // different account signed in here before, or access was removed): pick the first.
    if (!selectedTenantId || !data.items.some((t) => t.id === selectedTenantId)) {
      dispatch(setSelectedTenant(data.items[0]!.id));
    }
  }, [selectedTenantId, data, dispatch]);

  return (
    <label className="relative flex items-center text-sm text-slate-600">
      <span className="sr-only">Tenant</span>
      <FiGrid className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
      <select
        value={selectedTenantId ?? ""}
        onChange={(e) => dispatch(setSelectedTenant(e.target.value))}
        className="rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      >
        {!data?.items.length && <option value="">No tenants</option>}
        {data?.items.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
