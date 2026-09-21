const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE = /(?<![\w.])\+?\d[\d\s().-]{7,17}\d(?!\w)/g;
const URL_OR_HANDLE = /(?:https?:\/\/|www\.|linkedin\.com\/|github\.com\/)\S+/gi;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digitCount = (s: string) => s.replace(/\D/g, "").length;

/**
 * Removes what identifies a person from text that is about to leave for a
 * third-party AI provider: contact details, profile links, and the person's own
 * name (whole and per part). The model still gets the skills and history it
 * needs. This is best-effort minimisation, not anonymisation: an address or an
 * employer's name inside a CV would remain.
 */
export function redactPii(text: string, fullName?: string | null): string {
  let out = text
    .replace(EMAIL, "[email]")
    .replace(URL_OR_HANDLE, "[link]")
    // 10-15 digits is a phone number; "2015 - 2019" (8 digits) is a year range and stays.
    .replace(PHONE, (match) => (digitCount(match) >= 10 && digitCount(match) <= 15 ? "[phone]" : match));

  const parts = (fullName ?? "").split(/\s+/).filter((part) => part.length >= 3);
  if (parts.length > 0) {
    const names = [fullName!.trim(), ...parts].map(escapeRegExp).join("|");
    out = out.replace(new RegExp(`\\b(?:${names})\\b`, "gi"), "the candidate");
  }
  return out;
}
