import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { AppError, ForbiddenError } from "../lib/errors";
import { errorHandler } from "./errorHandler";

function run(err: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  errorHandler(err, {} as Request, { status } as unknown as Response, vi.fn());
  return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] };
}

describe("errorHandler", () => {
  it("maps a zod failure to 400 with the field details", () => {
    const parsed = z.object({ n: z.number() }).safeParse({ n: "x" });
    const { status, body } = run(parsed.error);
    expect(status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details.fieldErrors.n).toBeDefined();
  });

  it("uses an AppError's own status and message", () => {
    expect(run(new ForbiddenError("no")).status).toBe(403);
    expect(run(new AppError("teapot", 418)).body.error).toBe("teapot");
  });

  it("maps an oversized upload to 413 and other upload errors to 400", () => {
    expect(run(new multer.MulterError("LIMIT_FILE_SIZE")).status).toBe(413);
    expect(run(new multer.MulterError("LIMIT_UNEXPECTED_FILE")).status).toBe(400);
  });

  it("maps body-parser client errors (too large / bad JSON) to their 4xx status", () => {
    expect(run(Object.assign(new Error("too big"), { status: 413, expose: true })).status).toBe(413);
    expect(run(Object.assign(new Error("bad json"), { status: 400, expose: true })).status).toBe(400);
  });

  it("hides the details of anything unexpected behind a generic 500", () => {
    const { status, body } = run(new Error("connection string is postgres://user:secret@host"));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
