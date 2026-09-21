import { baseApi } from "./baseApi";
import type { AuthProfile, LoginResponse } from "../types";

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
    /** GET /api/auth/providers -> which optional sign-in methods the server has configured. */
    getAuthProviders: builder.query<{ google: boolean }, void>({
      query: () => "/auth/providers",
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery, useGetAuthProvidersQuery } = authApi;
