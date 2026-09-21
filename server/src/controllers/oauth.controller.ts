import crypto from "node:crypto";
import { Request, Response } from "express";
import { z } from "zod";
import { ServiceUnavailableError } from "../lib/errors";
import { readCookie } from "../lib/cookies";
import { buildGoogleAuthUrl, fetchGoogleProfile, getGoogleConfig } from "../lib/googleOAuth";
import { signOAuthState, verifyOAuthState } from "../lib/jwt";
import * as authService from "../services/auth.service";

const NONCE_COOKIE = "tf_oauth_nonce";
const COOKIE_PATH = "/api/auth/google";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
});

const clientUrl = () => process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const failTo = (res: Response, code: string) => res.redirect(`${clientUrl()}/login?error=${code}`);

export const oauthController = {
  googleStart(_req: Request, res: Response) {
    const config = getGoogleConfig();
    if (!config) throw new ServiceUnavailableError("Google sign-in is not configured");

    const nonce = crypto.randomBytes(16).toString("hex");
    res.cookie(NONCE_COOKIE, nonce, {
      httpOnly: true,
      // Lax: sent on the top-level redirect back from Google, withheld on cross-site subrequests.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
      path: COOKIE_PATH,
    });
    res.redirect(buildGoogleAuthUrl(config, signOAuthState(nonce)));
  },

  /** Google redirects the browser here. Every failure ends as a redirect to the login page, never a JSON error. */
  async googleCallback(req: Request, res: Response) {
    const config = getGoogleConfig();
    if (!config) return failTo(res, "failed");

    try {
      const { code, state, error } = callbackQuerySchema.parse(req.query);
      if (error || !code || !state) return failTo(res, "failed");

      const nonce = verifyOAuthState(state);
      const cookieNonce = readCookie(req.headers.cookie, NONCE_COOKIE) ?? "";
      const a = Buffer.from(nonce);
      const b = Buffer.from(cookieNonce);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return failTo(res, "failed");
      res.clearCookie(NONCE_COOKIE, { path: COOKIE_PATH });

      const profile = await fetchGoogleProfile(config, code);
      const token = await authService.loginWithVerifiedEmail(profile.email, profile.emailVerified);
      // In the URL *fragment*: browsers never send it to a server or log it.
      res.redirect(`${clientUrl()}/auth/callback#token=${encodeURIComponent(token)}`);
    } catch (err) {
      failTo(res, err instanceof authService.OAuthLoginError ? err.code : "failed");
    }
  },
};
