import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

/** The file could not be opened at all (as opposed to opened but containing no text). */
export class CvReadError extends Error {
  constructor(public reason: "password_protected" | "corrupt") {
    super(`CV could not be read: ${reason}`);
  }
}

const XML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

/** Text runs of a WordprocessingML fragment, one paragraph per line. */
function wordXmlToText(xml: string): string {
  return xml
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "") // text boxes are stored twice; keep one copy
    .replace(/<\/w:p>|<w:br\s*\/?>/g, "\n")
    .replace(/<w:tab\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (entity) => XML_ENTITIES[entity] ?? entity)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * What mammoth leaves out (its docs say so): page headers, footers and text
 * boxes. Many Word resumes put the name and contact details in exactly those
 * places, so without this the name/email/phone are simply missing.
 */
async function docxExtras(buffer: Buffer): Promise<{ header: string[]; other: string[] }> {
  const zip = await JSZip.loadAsync(buffer);
  const header: string[] = [];
  const other: string[] = [];

  for (const name of Object.keys(zip.files)) {
    if (!/^word\/(header|footer)\d*\.xml$/.test(name)) continue;
    const text = wordXmlToText(await zip.files[name]!.async("string"));
    (name.includes("header") ? header : other).push(...text.split("\n"));
  }

  const document = zip.file("word/document.xml");
  if (document) {
    const xml = (await document.async("string")).replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "");
    for (const box of xml.match(/<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g) ?? []) {
      other.push(...wordXmlToText(box).split("\n"));
    }
  }
  return { header, other };
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const body = (await mammoth.extractRawText({ buffer })).value ?? "";
  const bodyLines = new Set(body.split("\n").map((l) => l.trim()));
  // Extras that aren't already in the body: headers go first (that is where the name lives).
  let extras: { header: string[]; other: string[] } = { header: [], other: [] };
  try {
    extras = await docxExtras(buffer);
  } catch {
    // The body text alone is still a usable result.
  }
  const fresh = (lines: string[]) => lines.filter((l) => l && !bodyLines.has(l));
  return [...fresh(extras.header), body, ...fresh(extras.other)].join("\n");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/**
 * Extracts the raw text layer from a CV file. No OCR: real CVs (Word, Google
 * Docs, LaTeX, LinkedIn exports) carry a text layer; a scanned CV surfaces as
 * near-empty text instead. A file that cannot be opened at all (password
 * protected, damaged) is reported as a CvReadError, not a generic failure.
 */
export async function extractCvText(buffer: Buffer, kind: "pdf" | "docx"): Promise<string> {
  try {
    return kind === "docx" ? await extractDocxText(buffer) : await extractPdfText(buffer);
  } catch (err) {
    const description = `${(err as Error)?.name ?? ""} ${(err as Error)?.message ?? ""}`;
    throw new CvReadError(/password|encrypt/i.test(description) ? "password_protected" : "corrupt");
  }
}
