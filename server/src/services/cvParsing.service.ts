import { skillRepository } from "../repositories/skill.repository";
import { verifyCvFileType } from "../lib/fileTypeCheck";
import { extractCvText } from "../lib/cvTextExtractor";
import { extractCandidateFields, ParsedCandidateFields } from "../lib/cvFieldExtractor";

// Per the assignment appendix: extract the text and, if the result is
// nearly empty, treat the file as unreadable rather than guess.
const MIN_READABLE_CHARS = 40;

export interface CvParseResult {
  readable: boolean;
  fields?: ParsedCandidateFields;
}

export const cvParsingService = {
  async parse(buffer: Buffer): Promise<CvParseResult> {
    const kind = await verifyCvFileType(buffer);
    const text = await extractCvText(buffer, kind);

    if (text.trim().length < MIN_READABLE_CHARS) {
      return { readable: false };
    }

    const knownSkillNames = await skillRepository.findAllNames();
    return { readable: true, fields: extractCandidateFields(text, knownSkillNames) };
  },
};
