import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

/** Wraps every page that needs a login; sends anonymous visitors to /login and back afterwards. */
export function RequireAuth() {
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
