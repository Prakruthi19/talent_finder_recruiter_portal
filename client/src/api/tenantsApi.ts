import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { PageResult, Tenant } from "../types";

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const tenantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * useGetTenantsQuery(...) -> GET /api/tenants
     *   -> server/src/routes/tenant.routes.ts
     *   -> tenant.controller.ts  (list)   — validates query params
     *   -> tenant.service.ts    (list)   — no business logic, passthrough
     *   -> tenant.repository.ts (findMany) — only file that calls Prisma
     *   -> Postgres `tenants` table
     * Returns PageResult<Tenant>, i.e. { items, total, page, pageSize }.
     */
    getTenants: builder.query<PageResult<Tenant>, TenantListParams | void>({
      query: (params) => `/tenants${toQueryString({ ...params })}`,
      providesTags: ["Tenant"],
    }),
    /** useCreateTenantMutation() -> POST /api/tenants -> tenant.controller.create -> tenant.service.create (checks name uniqueness) -> tenant.repository.create (Prisma) */
    createTenant: builder.mutation<Tenant, { name: string }>({
      query: (body) => ({ url: "/tenants", method: "POST", body }),
      invalidatesTags: ["Tenant"],
    }),
  }),
});
export const { useGetTenantsQuery, useCreateTenantMutation } = tenantsApi;
