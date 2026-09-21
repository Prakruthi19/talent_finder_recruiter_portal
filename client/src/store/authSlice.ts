import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "talent-finder:token";

function loadToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Only the token is kept here. Who the user is and which tenants they may use
// come from GET /auth/me (RTK Query), so they can never go stale or be edited
// in localStorage. NOTE: a token in localStorage is readable by any script on
// the page (XSS); httpOnly cookies avoid that but need CSRF protection.
interface AuthState {
  token: string | null;
}

const authSlice = createSlice({
  name: "auth",
  initialState: { token: loadToken() } as AuthState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      try {
        localStorage.setItem(STORAGE_KEY, action.payload);
      } catch {
        // ignore storage failures (private browsing etc.)
      }
    },
    logout(state) {
      state.token = null;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;
