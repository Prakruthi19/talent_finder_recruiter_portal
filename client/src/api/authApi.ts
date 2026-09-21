import { baseApi } from "./baseApi";
import type { AuthProfile, Features, LoginResponse } from "../types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** POST /api/auth/login -> auth.service.login (bcrypt check) -> { token, user, tenants } */
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    /** GET /api/auth/me -> the signed-in user and the tenants (with roles) they may use. */
    getMe: builder.query<AuthProfile, void>({
      query: () => "/auth/me",
      providesTags: ["Me"],
    }),
    /** GET /api/features -> which optional features (AI, Google sign-in) the server has configured. */
    getFeatures: builder.query<Features, void>({
      query: () => "/features",
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useGetFeaturesQuery } = authApi;
