import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { JobOrder, JobOrderMatchesResult, PageResult } from "../types";

export interface JobOrderListParams {
  // Included so RTK Query's cache key changes per tenant — the actual
  // scoping happens server-side via the X-Tenant-Id header (see
  // baseApi.ts), which RTK Query's cache never looks at. Without this,
  // switching tenants while page/search/sort stay at their defaults
  // silently serves the *previous* tenant's cached list.
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "title" | "location" | "minExperience" | "createdAt";
  sortDir?: "asc" | "desc";
}

export interface CreateJobOrderInput {
  title: string;
  clientName?: string;
  location: string;
  minExperience: number;
  numberOfOpenings: number;
  skills: string[];
}

export interface UpdateJobOrderInput {
  title?: string;
  clientName?: string;
  location?: string;
  minExperience?: number;
  numberOfOpenings?: number;
  status?: "OPEN" | "CLOSED";
  skills?: string[];
}

export interface JobOrderSummary {
  total: number;
  openCount: number;
}

export const jobOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobOrders: builder.query<PageResult<JobOrder>, JobOrderListParams>({
      query: ({ tenantId: _tenantId, ...params }) => `/job-orders${toQueryString({ ...params })}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((j) => ({ type: "JobOrder" as const, id: j.id })),
              { type: "JobOrder" as const, id: "LIST" },
            ]
          : [{ type: "JobOrder" as const, id: "LIST" }],
    }),
    getJobOrder: builder.query<JobOrder, string>({
      query: (id) => `/job-orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: "JobOrder", id }],
    }),
    /**
     * useGetJobOrderMatchesQuery(id) -> GET /api/job-orders/:id/matches
     *   -> jobOrder.controller.matchingCandidates -> jobOrder.service.matchingCandidates
     *      -> jobOrder.repository.findMatchCounts  — RAW SQL join:
     *           job_order_required_skills JOIN candidate_skills ON skillId, grouped per candidate
     *           (Postgres does the counting, not JS)
     *      -> jobOrder.repository.findCandidatesByIds — fetch full Candidate rows for the ranked ids
     *      -> submission.repository.findByJobOrder — to flag which are already shortlisted
     *   Returns JobOrderMatchesResult = { jobOrder, matchingCandidates, shortlistedCandidates }
     */
    getJobOrderMatches: builder.query<JobOrderMatchesResult, string>({
      query: (id) => `/job-orders/${id}/matches`,
      providesTags: (_result, _error, id) => [{ type: "JobOrderMatches", id }],
    }),
    createJobOrder: builder.mutation<JobOrder, CreateJobOrderInput>({
      query: (body) => ({ url: "/job-orders", method: "POST", body }),
      invalidatesTags: [{ type: "JobOrder", id: "LIST" }, { type: "JobOrder", id: "SUMMARY" }],
    }),
    updateJobOrder: builder.mutation<JobOrder, { id: string; body: UpdateJobOrderInput }>({
      query: ({ id, body }) => ({ url: `/job-orders/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "JobOrder", id },
        { type: "JobOrder", id: "LIST" },
        { type: "JobOrder", id: "SUMMARY" },
        { type: "JobOrderMatches", id },
      ],
    }),
    deleteJobOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/job-orders/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "JobOrder", id: "LIST" }, { type: "JobOrder", id: "SUMMARY" }],
    }),
    /** GET /api/job-orders/summary -> jobOrder.controller.summary -> jobOrder.service.summary (2 Prisma counts, tenant-scoped) */
    getJobOrderSummary: builder.query<JobOrderSummary, { tenantId: string }>({
      query: () => "/job-orders/summary",
      providesTags: [{ type: "JobOrder", id: "SUMMARY" }],
    }),
    /**
     * useShortlistCandidateMutation() -> POST /api/job-orders/:jobOrderId/shortlist { candidateId }
     *   -> submission.controller.shortlist -> submission.service.shortlist
     *      -> re-verifies candidate/jobOrder belong to this tenant, recomputes matchCount
     *         server-side (never trusts the client's number), then
     *      -> submission.repository.create (Prisma, unique on candidateId+jobOrderId -> 409 on repeat)
     *   invalidatesTags then triggers this job order's matches query AND the Submission list to refetch.
     */
    shortlistCandidate: builder.mutation<unknown, { jobOrderId: string; candidateId: string }>({
      query: ({ jobOrderId, candidateId }) => ({
        url: `/job-orders/${jobOrderId}/shortlist`,
        method: "POST",
        body: { candidateId },
      }),
      invalidatesTags: (_result, _error, { jobOrderId, candidateId }) => [
        { type: "JobOrderMatches", id: jobOrderId },
        { type: "Submission", id: "LIST" },
        { type: "Submission", id: "SUMMARY" },
        { type: "Candidate", id: candidateId },
      ],
    }),
    /**
     * Optional AI bonus feature. useGenerateMatchInsightMutation() ->
     * POST /api/job-orders/:id/insight { candidateId } -> jobOrder.controller.generateInsight
     *   -> aiInsight.service.ts -> lib/aiProvider.ts (OpenAI-compatible chat
     *      completions call). Returns 503 with a clear message if AI_API_KEY
     *      isn't set on the server — not cached, no tag invalidation needed.
     */
    generateMatchInsight: builder.mutation<
      { insight: string },
      { jobOrderId: string; candidateId: string }
    >({
      query: ({ jobOrderId, candidateId }) => ({
        url: `/job-orders/${jobOrderId}/insight`,
        method: "POST",
        body: { candidateId },
      }),
    }),
  }),
});

export const {
  useGetJobOrdersQuery,
  useGetJobOrderQuery,
  useGetJobOrderMatchesQuery,
  useCreateJobOrderMutation,
  useUpdateJobOrderMutation,
  useDeleteJobOrderMutation,
  useShortlistCandidateMutation,
  useGetJobOrderSummaryQuery,
  useGenerateMatchInsightMutation,
} = jobOrdersApi;
