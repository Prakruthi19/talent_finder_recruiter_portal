import { baseApi } from "./baseApi";
import { toQueryString } from "./queryParams";
import type { Candidate, CandidateWithSubmissions, CvParseResult, PageResult } from "../types";

export interface CandidateListParams {
  // Included so RTK Query's cache key changes per tenant — the actual
  // scoping happens server-side via the X-Tenant-Id header (see
  // baseApi.ts), which RTK Query's cache never looks at. Without this,
  // switching tenants while page/search/sort stay at their defaults
  // silently serves the *previous* tenant's cached list.
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "fullName" | "location" | "experienceYears" | "createdAt";
  sortDir?: "asc" | "desc";
}

export interface CandidateSummary {
  total: number;
  addedThisWeek: number;
}

export interface CreateCandidateInput {
  fullName: string;
  email?: string;
  location?: string;
  experienceYears: number;
  skills: string[];
  cvFile?: File | null;
}

export interface UpdateCandidateInput {
  fullName?: string;
  email?: string;
  location?: string;
  experienceYears?: number;
  skills?: string[];
}

function buildCandidateFormData(input: CreateCandidateInput): FormData {
  const formData = new FormData();
  formData.set("fullName", input.fullName);
  if (input.email) formData.set("email", input.email);
  if (input.location) formData.set("location", input.location);
  formData.set("experienceYears", String(input.experienceYears));
  input.skills.forEach((skill) => formData.append("skills", skill));
  if (input.cvFile) formData.set("cv", input.cvFile);
  return formData;
}

export const candidatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * useGetCandidatesQuery(...) -> GET /api/candidates (X-Tenant-Id header set by baseApi.ts)
     *   -> candidate.routes.ts -> requireTenant middleware -> candidate.controller.list
     *   -> candidate.service.list -> candidate.repository.findMany (Prisma) -> Postgres `candidates`
     * Returns PageResult<Candidate>.
     */
    getCandidates: builder.query<PageResult<Candidate>, CandidateListParams>({
      query: ({ tenantId: _tenantId, ...params }) => `/candidates${toQueryString({ ...params })}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((c) => ({ type: "Candidate" as const, id: c.id })),
              { type: "Candidate" as const, id: "LIST" },
            ]
          : [{ type: "Candidate" as const, id: "LIST" }],
    }),
    /** GET /api/candidates/summary -> candidate.controller.summary -> candidate.service.summary (2 Prisma counts) */
    getCandidateSummary: builder.query<CandidateSummary, { tenantId: string }>({
      query: () => "/candidates/summary",
      providesTags: [{ type: "Candidate", id: "SUMMARY" }],
    }),
    /** GET /api/candidates/:id -> candidate.controller.getById -> candidate.service.getById -> candidate.repository.findById (includes skills + submissions) */
    getCandidate: builder.query<CandidateWithSubmissions, string>({
      query: (id) => `/candidates/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Candidate", id }],
    }),
    /**
     * useCreateCandidateMutation() -> POST /api/candidates as multipart FormData (buildCandidateFormData below)
     *   -> multer parses the optional `cv` file to server/uploads/
     *   -> candidate.controller.create -> candidate.service.create
     *        -> skill.repository.findOrCreateMany (resolves skill names to Skill rows)
     *        -> candidate.repository.create (Prisma, writes Candidate + CandidateSkill join rows)
     */
    createCandidate: builder.mutation<Candidate, CreateCandidateInput>({
      query: (input) => ({
        url: "/candidates",
        method: "POST",
        body: buildCandidateFormData(input),
      }),
      invalidatesTags: [
        { type: "Candidate", id: "LIST" },
        { type: "Candidate", id: "SUMMARY" },
      ],
    }),
    /** PATCH /api/candidates/:id -> candidate.controller.update -> candidate.service.update -> candidate.repository.update */
    updateCandidate: builder.mutation<Candidate, { id: string; body: UpdateCandidateInput }>({
      query: ({ id, body }) => ({ url: `/candidates/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Candidate", id },
        { type: "Candidate", id: "LIST" },
      ],
    }),
    /** DELETE /api/candidates/:id -> candidate.controller.remove -> candidate.service.delete (also unlinks the CV file on disk) */
    deleteCandidate: builder.mutation<void, string>({
      query: (id) => ({ url: `/candidates/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Candidate", id: "LIST" },
        { type: "Candidate", id: "SUMMARY" },
      ],
    }),
    /**
     * CV auto-fill bonus. useParseCvMutation() -> POST /api/candidates/parse-cv (multipart, parse-only,
     * nothing persisted) -> candidate.controller.parseCv -> cvParsing.service.ts
     *   -> lib/fileTypeCheck.ts (real byte sniffing, not just the claimed Content-Type)
     *   -> lib/cvTextExtractor.ts (pdf-parse / mammoth)
     *   -> lib/cvFieldExtractor.ts (regex + compromise NLP + fuse.js fuzzy skill matching)
     * Returns { readable: false, reason } for an unreadable file (scanned, password-protected, damaged) rather than
     * erroring; the caller falls back to manual entry, per the spec's CV Upload acceptance criteria.
     * Not cached — no tag invalidation needed.
     */
    parseCv: builder.mutation<CvParseResult, { file: File; ai?: boolean }>({
      query: ({ file, ai }) => {
        const formData = new FormData();
        formData.set("cv", file);
        // ai=true also sends the CV text to the AI provider, so it is only ever an explicit opt-in.
        return { url: `/candidates/parse-cv${ai ? "?ai=true" : ""}`, method: "POST", body: formData };
      },
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetCandidateSummaryQuery,
  useGetCandidateQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useParseCvMutation,
} = candidatesApi;
