import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateChatCompletion } from "./aiProvider";
import { ServiceUnavailableError } from "./errors";

const ORIGINAL_ENV = { ...process.env };

describe("generateChatCompletion", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws ServiceUnavailableError when AI_API_KEY is not set", async () => {
    delete process.env.AI_API_KEY;

    await expect(generateChatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableError
    );
  });

  it("returns the trimmed completion text on a successful call", async () => {
    process.env.AI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "  Strong fit.  " } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateChatCompletion([{ role: "user", content: "hi" }]);

    expect(result).toBe("Strong fit.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/chat/completions"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      })
    );
  });

  it("throws ServiceUnavailableError when the provider responds with a non-OK status", async () => {
    process.env.AI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    await expect(generateChatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableError
    );
  });

  it("throws ServiceUnavailableError when the network request itself fails", async () => {
    process.env.AI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(generateChatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableError
    );
  });

  it("throws ServiceUnavailableError when the response has no completion text", async () => {
    process.env.AI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [] }) })
    );

    await expect(generateChatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableError
    );
  });
});
