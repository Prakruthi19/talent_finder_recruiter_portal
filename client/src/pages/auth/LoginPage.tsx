import { FormEvent, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { API_BASE_URL } from "../../api/baseApi";
import { useGetFeaturesQuery, useLoginMutation } from "../../api/authApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setToken } from "../../store/authSlice";
import { FormField } from "../../components/forms/FormField";
import { Button } from "../../components/ui/Button";

// Messages for the ?error=... codes the server's Google callback redirects back with.
const OAUTH_ERRORS: Record<string, string> = {
  no_account: "There is no Talent Finder account for that Google address. Ask an admin to invite you.",
  unverified: "Google says that email address isn't verified.",
  failed: "Google sign-in failed. Please try again.",
};

// Demo shortcuts exist only in development builds, never in a production bundle.
const DEMO_LOGINS = [
  { label: "Admin", email: "admin@talentfinder.demo", password: "Admin@12345" },
  { label: "Recruiter", email: "recruiter@talentfinder.demo", password: "Recruit@12345" },
];

export function LoginPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: features } = useGetFeaturesQuery();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(OAUTH_ERRORS[searchParams.get("error") ?? ""]);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
  if (token) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      const result = await login({ email: email.trim(), password }).unwrap();
      dispatch(setToken(result.token));
    } catch (err) {
      setError((err as { data?: { error?: string } })?.data?.error ?? "Could not sign in. Is the server running?");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
            TF
          </span>
          <span className="text-xl font-semibold tracking-tight text-slate-900">Talent Finder</span>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isLoading || !email || !password}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {features?.google && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              {/* A full-page redirect: Google's consent screen can't run inside our SPA. */}
              <a
                href={`${API_BASE_URL}/auth/google`}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FcGoogle className="h-4 w-4" aria-hidden="true" />
                Continue with Google
              </a>
            </>
          )}
        </div>

        {import.meta.env.DEV && (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
            Demo logins (dev only):
            <div className="mt-2 flex justify-center gap-2">
              {DEMO_LOGINS.map((demo) => (
                <Button
                  key={demo.email}
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(demo.password);
                  }}
                >
                  {demo.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
