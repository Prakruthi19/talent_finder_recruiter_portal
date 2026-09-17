import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "talent-finder:selectedTenantId";

function loadPersistedTenantId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface TenantState {
  selectedTenantId: string | null;
}

const initialState: TenantState = {
  selectedTenantId: loadPersistedTenantId(),
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setSelectedTenant(state, action: PayloadAction<string>) {
      state.selectedTenantId = action.payload;
      try {
        localStorage.setItem(STORAGE_KEY, action.payload);
      } catch {
        // ignore storage failures (private browsing etc.)
      }
    },
  },
});

export const { setSelectedTenant } = tenantSlice.actions;
export default tenantSlice.reducer;
