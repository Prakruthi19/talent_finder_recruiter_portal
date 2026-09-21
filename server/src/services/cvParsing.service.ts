import { skillRepository } from "../repositories/skill.repository";
import { verifyCvFileType } from "../lib/fileTypeCheck";
import { CvReadError, extractCvText } from "../lib/cvTextExtractor";
import { MIN_READABLE_LETTERS, normalizeCvText, textStats } from "../lib/cvTextNormalizer";
import { extractCandidateFields, ParsedCandidateFields } from "../lib/cvFieldExtractor";
import { extractFieldsWithAi, mergeAiFields } from "../lib/cvAiExtractor";

/** Why nothing could be read, so the UI can say something more useful than "failed". */
export type UnreadableReason = "empty" | "password_protected" | "corrupt";

export interface CvParseDiagnostics {
  characters: number;
  letters: number;
  words: number;
  /** True when the model refined the result (only ever on explicit request). */
  aiUsed: boolean;
}

export interface CvParseResult {
  readable: boolean;
  reason?: UnreadableReason;
  fields?: ParsedCandidateFields;
  diagnostics?: CvParseDiagnostics;
}

export const cvParsingService = {
  /**
   * Parse-only: nothing is stored. An unreadable file is a normal outcome (the
   * caller falls back to manual entry, per the spec), not an error.
   */
  async parse(buffer: Buffer, options: { useAi?: boolean; now?: Date } = {}): Promise<CvParseResult> {
    const kind = await verifyCvFileType(buffer);

    let rawText: string;
    try {
      rawText = await extractCvText(buffer, kind);
    } catch (err) {
      if (err instanceof CvReadError) return { readable: false, reason: err.reason };
      throw err;
    }

    const text = normalizeCvText(rawText);
    const stats = textStats(text);
    // Letters after cleaning, not raw length: page markers and whitespace must
    // not make an image-only (scanned) CV look readable.
    if (stats.letters < MIN_READABLE_LETTERS) {
      return { readable: false, reason: "empty", diagnostics: { ...stats, aiUsed: false } };
    }

    const knownSkillNames = await skillRepository.findAllNames();
    let fields = extractCandidateFields(text, knownSkillNames, { now: options.now });
    if (options.useAi) {
      fields = mergeAiFields(fields, await extractFieldsWithAi(text, knownSkillNames), knownSkillNames);
    }
    return { readable: true, fields, diagnostics: { ...stats, aiUsed: Boolean(options.useAi) } };
  },
};
