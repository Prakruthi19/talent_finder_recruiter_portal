import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { PageResult, Submission } from "../types";

export interface SubmissionListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "createdAt" | "status";
  sortDir?: "asc" | "desc";
}

export const submissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * useGetSubmissionsQuery(...) -> GET /api/submissions
     *   -> submission.controller.list -> submission.service.list
     *   -> submission.repository.findMany (Prisma, includes candidate + jobOrder relations)
     *   -> Postgres `submissions` table (rows created by shortlistCandidate in jobOrdersApi.ts)
     */
    getSubmissions: builder.query<PageResult<Submission>, SubmissionListParams | void>({
      query: (params) => `/submissions${toQueryString({ ...params })}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((s) => ({ type: "Submission" as const, id: s.id })),
              { type: "Submission" as const, id: "LIST" },
            ]
          : [{ type: "Submission" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetSubmissionsQuery } = submissionsApi;
