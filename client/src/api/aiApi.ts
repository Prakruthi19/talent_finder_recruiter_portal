import { baseApi } from "./baseApi";
import type { CandidateSearchResult, JobDescriptionDraft, OutreachDraft } from "../types";

type Tone = "friendly" | "formal";

// Every AI call goes through POST /api/ai/... which the server gates with login,
// tenant membership and a per-user rate limit. Nothing here is cached: each is an
// action the user asked for, and each costs money.
export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    parseJobDescription: builder.mutation<JobDescriptionDraft, { text: string }>({
      query: (body) => ({ url: "/ai/parse-job-description", method: "POST", body }),
    }),
    summarizeCandidate: builder.mutation<{ summary: string; usedCv: boolean }, string>({
      query: (candidateId) => ({ url: `/ai/candidates/${candidateId}/summary`, method: "POST" }),
    }),
    draftOutreach: builder.mutation<OutreachDraft, { jobOrderId: string; candidateId: string; tone: Tone }>({
      query: ({ jobOrderId, candidateId, tone }) => ({
        url: `/ai/job-orders/${jobOrderId}/outreach`,
        method: "POST",
        body: { candidateId, tone },
      }),
    }),
    interviewQuestions: builder.mutation<{ questions: string[] }, { jobOrderId: string; candidateId: string }>({
      query: ({ jobOrderId, candidateId }) => ({
        url: `/ai/job-orders/${jobOrderId}/interview-questions`,
        method: "POST",
        body: { candidateId },
      }),
    }),
    searchCandidates: builder.mutation<CandidateSearchResult, { query: string }>({
      query: (body) => ({ url: "/ai/candidate-search", method: "POST", body }),
    }),
    dashboardBrief: builder.mutation<{ brief: string }, void>({
      query: () => ({ url: "/ai/dashboard-brief", method: "POST" }),
    }),
  }),
});

export const {
  useParseJobDescriptionMutation,
  useSummarizeCandidateMutation,
  useDraftOutreachMutation,
  useInterviewQuestionsMutation,
  useSearchCandidatesMutation,
  useDashboardBriefMutation,
} = aiApi;
