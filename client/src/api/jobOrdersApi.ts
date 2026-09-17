import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { JobOrder, JobOrderMatchesResult, PageResult } from "../types";

export interface JobOrderListParams {
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

export const jobOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobOrders: builder.query<PageResult<JobOrder>, JobOrderListParams | void>({
      query: (params) => `/job-orders${toQueryString({ ...params })}`,
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
      invalidatesTags: [{ type: "JobOrder", id: "LIST" }],
    }),
    updateJobOrder: builder.mutation<JobOrder, { id: string; body: UpdateJobOrderInput }>({
      query: ({ id, body }) => ({ url: `/job-orders/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "JobOrder", id },
        { type: "JobOrder", id: "LIST" },
        { type: "JobOrderMatches", id },
      ],
    }),
    deleteJobOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/job-orders/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "JobOrder", id: "LIST" }],
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
        { type: "Candidate", id: candidateId },
      ],
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
} = jobOrdersApi;
