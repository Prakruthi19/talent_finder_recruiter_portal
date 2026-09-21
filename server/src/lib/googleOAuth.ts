import { UnauthorizedError } from "./errors";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  name: string;
}

/** Google sign-in is optional: it is on only when all three settings are present. */
export function getGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = env;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

export function buildGoogleAuthUrl(config: GoogleConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Authorization-code flow, server side: the code is exchanged with our client
 * secret, then the access token is used to read the profile. The profile comes
 * straight from Google over TLS, so it doesn't need a separate signature check.
 */
export async function fetchGoogleProfile(
  config: GoogleConfig,
  code: string,
  fetchFn: typeof fetch = fetch
): Promise<GoogleProfile> {
  const tokenResponse = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) throw new UnauthorizedError("Google rejected the sign-in code");
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) throw new UnauthorizedError("Google returned no access token");

  const profileResponse = await fetchFn(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!profileResponse.ok) throw new UnauthorizedError("Could not read the Google profile");
  const profile = (await profileResponse.json()) as { email?: string; email_verified?: boolean; name?: string };
  if (!profile.email) throw new UnauthorizedError("Google returned no email address");

  return { email: profile.email.toLowerCase(), emailVerified: profile.email_verified === true, name: profile.name ?? "" };
}
