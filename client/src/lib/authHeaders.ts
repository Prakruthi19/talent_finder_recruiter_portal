import { store } from "../store/store";

/**
 * Headers for the few requests made with plain fetch (file downloads) instead
 * of RTK Query, so they carry the same credentials baseApi attaches.
 */
export function authHeaders(): Record<string, string> {
  const { auth, tenant } = store.getState();
  const headers: Record<string, string> = {};
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (tenant.selectedTenantId) headers["X-Tenant-Id"] = tenant.selectedTenantId;
  return headers;
}
