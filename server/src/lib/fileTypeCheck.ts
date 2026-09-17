import { ValidationError } from "./errors";

const ALLOWED_MIME_TO_KIND = new Map<string, "pdf" | "docx">([
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

/**
 * Multer's fileFilter only checks the Content-Type header the client sent,
 * which is trivially spoofable. This sniffs the actual file bytes (magic
 * numbers / zip structure for docx) so a renamed .exe can't pass itself off
 * as a CV. file-type is ESM-only, hence the dynamic import from this CJS
 * codebase.
 */
export async function verifyCvFileType(buffer: Buffer): Promise<"pdf" | "docx"> {
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);
  const kind = detected && ALLOWED_MIME_TO_KIND.get(detected.mime);

  if (!kind) {
    throw new ValidationError({
      cv: "This file's contents don't match a supported CV format (.pdf or .docx).",
    });
  }
  return kind;
}
