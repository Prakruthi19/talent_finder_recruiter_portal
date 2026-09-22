import { baseApi } from "./baseApi";
import type { Interview, InterviewMode, InterviewStatus } from "../types";

export interface ScheduleInterviewInput {
  submissionId: string;
  scheduledAt: string;
  mode: InterviewMode;
  notes?: string;
}

export interface UpdateInterviewInput {
  status?: InterviewStatus;
  scheduledAt?: string;
  notes?: string;
}

// Both mutations invalidate the parent Submission (its detail page embeds the
// interview rounds list), not their own tag — there's no interview list view.
export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** POST /api/interviews -> interview.controller.schedule -> interview.service.schedule (round assigned server-side) */
    scheduleInterview: builder.mutation<Interview, ScheduleInterviewInput>({
      query: (body) => ({ url: "/interviews", method: "POST", body }),
      invalidatesTags: (_result, _error, { submissionId }) => [{ type: "Submission", id: submissionId }],
    }),
    /** PATCH /api/interviews/:id -> interview.controller.update -> interview.service.updateStatus */
    updateInterview: builder.mutation<Interview, { id: string; submissionId: string; body: UpdateInterviewInput }>({
      query: ({ id, body }) => ({ url: `/interviews/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { submissionId }) => [{ type: "Submission", id: submissionId }],
    }),
  }),
});

export const { useScheduleInterviewMutation, useUpdateInterviewMutation } = interviewsApi;
