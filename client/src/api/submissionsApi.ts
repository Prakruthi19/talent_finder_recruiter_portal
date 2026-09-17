import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { PageResult, Submission } from "../types";

export interface SubmissionListParams {
  // Included so RTK Query's cache key changes per tenant — the actual
  // scoping happens server-side via the X-Tenant-Id header (see
  // baseApi.ts), which RTK Query's cache never looks at. Without this,
  // switching tenants while page/search/sort stay at their defaults
  // silently serves the *previous* tenant's cached list.
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "createdAt" | "status";
  sortDir?: "asc" | "desc";
}

export interface SubmissionSummary {
  total: number;
  shortlistedCount: number;
}

export const submissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * useGetSubmissionsQuery(...) -> GET /api/submissions
     *   -> submission.controller.list -> submission.service.list
     *   -> submission.repository.findMany (Prisma, includes candidate + jobOrder relations)
     *   -> Postgres `submissions` table (rows created by shortlistCandidate in jobOrdersApi.ts)
     */
    getSubmissions: builder.query<PageResult<Submission>, SubmissionListParams>({
      query: ({ tenantId: _tenantId, ...params }) => `/submissions${toQueryString({ ...params })}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((s) => ({ type: "Submission" as const, id: s.id })),
              { type: "Submission" as const, id: "LIST" },
            ]
          : [{ type: "Submission" as const, id: "LIST" }],
    }),
    /** GET /api/submissions/summary -> submission.controller.summary -> submission.service.summary (2 Prisma counts, tenant-scoped) */
    getSubmissionSummary: builder.query<SubmissionSummary, { tenantId: string }>({
      query: () => "/submissions/summary",
      providesTags: [{ type: "Submission", id: "SUMMARY" }],
    }),
  }),
});

export const { useGetSubmissionsQuery, useGetSubmissionSummaryQuery } = submissionsApi;
