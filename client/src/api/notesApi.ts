import { baseApi } from "./baseApi";
import type { Note } from "../types";

// Notes are an append-only log on a Candidate or a Submission — no update/delete,
// so a fresh GET after POST is all the cache management this needs.
export const notesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCandidateNotes: builder.query<Note[], string>({
      query: (candidateId) => `/candidates/${candidateId}/notes`,
      providesTags: (_result, _error, candidateId) => [{ type: "Note", id: `candidate-${candidateId}` }],
    }),
    addCandidateNote: builder.mutation<Note, { candidateId: string; body: string }>({
      query: ({ candidateId, body }) => ({ url: `/candidates/${candidateId}/notes`, method: "POST", body: { body } }),
      invalidatesTags: (_result, _error, { candidateId }) => [{ type: "Note", id: `candidate-${candidateId}` }],
    }),
    getSubmissionNotes: builder.query<Note[], string>({
      query: (submissionId) => `/submissions/${submissionId}/notes`,
      providesTags: (_result, _error, submissionId) => [{ type: "Note", id: `submission-${submissionId}` }],
    }),
    addSubmissionNote: builder.mutation<Note, { submissionId: string; body: string }>({
      query: ({ submissionId, body }) => ({ url: `/submissions/${submissionId}/notes`, method: "POST", body: { body } }),
      invalidatesTags: (_result, _error, { submissionId }) => [{ type: "Note", id: `submission-${submissionId}` }],
    }),
  }),
});

export const {
  useGetCandidateNotesQuery,
  useAddCandidateNoteMutation,
  useGetSubmissionNotesQuery,
  useAddSubmissionNoteMutation,
} = notesApi;
