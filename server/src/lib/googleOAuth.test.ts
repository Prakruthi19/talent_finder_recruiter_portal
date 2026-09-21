import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "./errors";
import { readCookie } from "./cookies";
import { buildGoogleAuthUrl, fetchGoogleProfile, getGoogleConfig } from "./googleOAuth";

const config = { clientId: "cid", clientSecret: "secret", redirectUri: "http://localhost:4000/api/auth/google/callback" };

const reply = (ok: boolean, body: unknown) => ({ ok, json: async () => body }) as Response;

describe("getGoogleConfig", () => {
  it("is off unless all three settings are present", () => {
    expect(getGoogleConfig({})).toBeNull();
    expect(getGoogleConfig({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b" })).toBeNull();
    expect(
      getGoogleConfig({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", GOOGLE_REDIRECT_URI: "http://x/cb" })
    ).toEqual({ clientId: "a", clientSecret: "b", redirectUri: "http://x/cb" });
  });
});

describe("buildGoogleAuthUrl", () => {
  it("asks for the authorization-code flow with email scope and our signed state", () => {
    const url = new URL(buildGoogleAuthUrl(config, "signed-state"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("cid");
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("signed-state");
    // The client secret must never appear in a URL the browser sees.
    expect(url.toString()).not.toContain("secret");
  });
});

describe("fetchGoogleProfile", () => {
  it("exchanges the code, then reads a lowercased profile", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(reply(true, { access_token: "at" }))
      .mockResolvedValueOnce(reply(true, { email: "Ada@Example.com", email_verified: true, name: "Ada" }));

    const profile = await fetchGoogleProfile(config, "the-code", fetchFn as unknown as typeof fetch);

    expect(profile).toEqual({ email: "ada@example.com", emailVerified: true, name: "Ada" });
    const tokenBody = (fetchFn.mock.calls[0]![1] as { body: URLSearchParams }).body;
    expect(tokenBody.get("code")).toBe("the-code");
    expect(tokenBody.get("client_secret")).toBe("secret");
    expect((fetchFn.mock.calls[1]![1] as { headers: Record<string, string> }).headers.Authorization).toBe("Bearer at");
  });

  it("does not treat a missing email_verified as verified", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(reply(true, { access_token: "at" }))
      .mockResolvedValueOnce(reply(true, { email: "a@b.co" }));
    expect((await fetchGoogleProfile(config, "c", fetchFn as unknown as typeof fetch)).emailVerified).toBe(false);
  });

  it("rejects when Google refuses the code", async () => {
    const fetchFn = vi.fn().mockResolvedValue(reply(false, {}));
    await expect(fetchGoogleProfile(config, "bad", fetchFn as unknown as typeof fetch)).rejects.toThrow(UnauthorizedError);
  });

  it("rejects when Google gives no access token or no email", async () => {
    const noToken = vi.fn().mockResolvedValue(reply(true, {}));
    await expect(fetchGoogleProfile(config, "c", noToken as unknown as typeof fetch)).rejects.toThrow(UnauthorizedError);

    const noEmail = vi
      .fn()
      .mockResolvedValueOnce(reply(true, { access_token: "at" }))
      .mockResolvedValueOnce(reply(true, { name: "Ada" }));
    await expect(fetchGoogleProfile(config, "c", noEmail as unknown as typeof fetch)).rejects.toThrow(UnauthorizedError);
  });
});

describe("readCookie", () => {
  it("finds one cookie among several and decodes it", () => {
    expect(readCookie("a=1; tf_oauth_nonce=abc%20def; b=2", "tf_oauth_nonce")).toBe("abc def");
  });
  it("returns undefined when absent", () => {
    expect(readCookie(undefined, "x")).toBeUndefined();
    expect(readCookie("a=1", "x")).toBeUndefined();
  });
});
