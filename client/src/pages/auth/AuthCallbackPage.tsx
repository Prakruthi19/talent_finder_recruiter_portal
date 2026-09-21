import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setToken } from "../../store/authSlice";

/**
 * Where the server sends the browser after a successful Google sign-in:
 * /auth/callback#token=<jwt>. The token is in the URL *fragment*, which the
 * browser never sends to any server and which isn't written to access logs.
 * It is stored, then removed from the address bar and history straight away.
 */
export function AuthCallbackPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (fromHash) dispatch(setToken(fromHash));
    window.history.replaceState(null, "", window.location.pathname);
  }, [dispatch]);

  // Until the effect has stored the token there is nothing to redirect to.
  return token ? <Navigate to="/" replace /> : <p className="p-6 text-sm text-slate-500">Signing you in...</p>;
}
