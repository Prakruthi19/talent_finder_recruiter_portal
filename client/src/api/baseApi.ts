import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store/store";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    // Every candidates/job-orders/submissions request (any endpoint injected via
    // this baseApi) automatically gets the currently-selected tenant attached
    // here — reads tenantSlice.ts, not passed manually at each call site.
    // Backend side: server/src/middleware/tenantContext.ts reads this same
    // header and rejects the request with 400 if it's missing.
    prepareHeaders: (headers, { getState }) => {
      const tenantId = (getState() as RootState).tenant.selectedTenantId;
      if (tenantId) headers.set("X-Tenant-Id", tenantId);
      return headers;
    },
  }),
  tagTypes: ["Tenant", "Candidate", "JobOrder", "Submission", "JobOrderMatches"],
  endpoints: () => ({}),
});
