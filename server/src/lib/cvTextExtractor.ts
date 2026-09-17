import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extracts the raw text layer from a CV file. No OCR — per the assignment
 * appendix, real CVs (Word/Docs/LaTeX/Canva/LinkedIn exports) carry a real
 * text layer; a scanned/photographed CV is a rare, explicitly out-of-scope
 * edge case that surfaces as near-empty extracted text instead.
 */
export async function extractCvText(buffer: Buffer, kind: "pdf" | "docx"): Promise<string> {
  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}
