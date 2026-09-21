import { useNavigate } from "react-router-dom";
import { useGetMeQuery } from "../api/authApi";
import { baseApi } from "../api/baseApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";
import type { Role } from "../types";

/** The signed-in user's role in the currently selected tenant (roles are per tenant). */
export function useCurrentRole(): Role | undefined {
  const token = useAppSelector((s) => s.auth.token);
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const { data } = useGetMeQuery(undefined, { skip: !token });
  return data?.tenants.find((t) => t.id === tenantId)?.role;
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    navigate("/login", { replace: true });
  };
}
