import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  // Every request (any endpoint injected via baseApi) automatically carries the
  // login token and the currently-selected tenant, read from the store, never
  // passed at call sites. Backend: middleware/auth.ts verifies the token and
  // middleware/tenantContext.ts checks the user is a member of that tenant, so
  // the tenant header is only ever a *request*.
  prepareHeaders: (headers, { getState }) => {
    const { auth, tenant } = getState() as RootState;
    if (auth.token) headers.set("Authorization", `Bearer ${auth.token}`);
    if (tenant.selectedTenantId) headers.set("X-Tenant-Id", tenant.selectedTenantId);
    return headers;
  },
});

// A 401 while signed in means the token expired or was revoked. Drop the
// session, and every cached result with it: the cache belongs to that user.
// (A 401 from the login form itself has no token yet, so it just shows the error.)
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && (api.getState() as RootState).auth.token) {
    api.dispatch(logout());
    api.dispatch(baseApi.util.resetApiState());
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Tenant", "Candidate", "JobOrder", "Submission", "JobOrderMatches", "Me", "Audit", "Note"],
  // Dashboard/Audit data goes stale after almost any action, so it is always
  // fetched fresh when its page is opened (see dashboardApi.ts).
  endpoints: () => ({}),
});
