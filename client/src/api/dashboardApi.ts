import { baseApi } from "./baseApi";
import type { AuditLogRow, DashboardOverview, PageResult } from "../types";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * GET /api/dashboard -> dashboard.service.overview (counts + raw-SQL skill demand/supply), tenant-scoped.
     * `tenantId` is in the args only so RTK Query's cache key changes per tenant (it never
     * looks at headers); see the note on CandidateListParams. The page also refetches on mount,
     * since almost any change elsewhere alters these numbers.
     */
    getDashboard: builder.query<DashboardOverview, { tenantId: string }>({
      query: () => "/dashboard",
    }),
    /** GET /api/audit-logs (tenant admins only). Same tenantId-in-args rule as above. */
    getAuditLogs: builder.query<PageResult<AuditLogRow>, { tenantId: string; page: number; pageSize: number }>({
      query: ({ page, pageSize }) => `/audit-logs?page=${page}&pageSize=${pageSize}`,
      providesTags: ["Audit"],
    }),
  }),
});

export const { useGetDashboardQuery, useGetAuditLogsQuery } = dashboardApi;
