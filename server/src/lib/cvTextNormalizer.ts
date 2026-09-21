// A CV counts as readable when it contains at least this many *letters* after
// cleaning. Letters, not characters: PDF page markers, bullets and whitespace
// must not make an image-only CV look readable.
export const MIN_READABLE_LETTERS = 40;

const MAX_CHARS = 60_000;
const PAGE_MARKER = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/;
const BULLETS = /[•●▪■◦►▶‣⁃]/g;

/**
 * Some PDFs (designer templates) space every letter: "S K I L L S", with wider
 * gaps between words. Such lines defeat every later match, so they are joined
 * back up. Only lines that are mostly single characters are touched.
 */
function fixLetterSpacing(line: string): string {
  const tokens = line.trim().split(/ +/);
  const singles = tokens.filter((t) => t.length === 1).length;
  if (tokens.length < 4 || singles / tokens.length < 0.7) return line;
  return line
    .trim()
    .split(/ {2,}/)
    .map((word) => word.replace(/ /g, ""))
    .join(" ");
}

/**
 * Cleans raw extracted text so the field extractors see what a human sees:
 * ligatures and odd spaces folded, bullets on their own lines, page markers
 * and hyphenation from line wrapping removed, letter-spacing repaired.
 * Idempotent, so it is safe to apply more than once.
 */
export function normalizeCvText(raw: string): string {
  const text = raw
    .normalize("NFKC") // ﬁ -> fi, fullwidth -> ascii
    .replace(/[­​-‍﻿]/g, "") // soft hyphen, zero-width characters
    .replace(/[  -  ]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(BULLETS, "\n- ")
    .replace(/(\w)-\n\s*([a-z])/g, "$1$2"); // "develop-\nment" -> "development"

  const lines = text
    .split("\n")
    .filter((line) => !PAGE_MARKER.test(line))
    .map((line) => fixLetterSpacing(line).replace(/ {2,}/g, " ").trim());

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_CHARS);
}

export function textStats(text: string) {
  return {
    characters: text.length,
    letters: (text.match(/\p{L}/gu) ?? []).length,
    words: (text.match(/\p{L}[\p{L}\p{N}'’.+#-]*/gu) ?? []).length,
  };
}
