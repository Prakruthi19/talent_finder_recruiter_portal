import { ChangeEvent, useState } from "react";
import { FiPlus, FiUploadCloud } from "react-icons/fi";
import { useParseCvMutation } from "../../api/candidatesApi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { Button } from "../ui/Button";
import type { CvParseResult, ParsedCandidateFields, UnreadableReason } from "../../types";

interface Props {
  /** The chosen file (kept by the page so it can be uploaded with the candidate). */
  onFile: (file: File | null) => void;
  /** Apply what was detected to the form; the recruiter still reviews it. */
  onFields: (fields: ParsedCandidateFields) => void;
  onAddSkill: (skill: string) => void;
  /** Skills already on the form, so suggestions don't repeat them. */
  skills: string[];
}

const UNREADABLE: Record<UnreadableReason, string> = {
  empty:
    "No text could be read from this file. It looks like a scanned or image-only CV, so please fill in the fields manually.",
  password_protected:
    "This PDF is password protected. Remove the password and upload it again, or fill in the fields manually.",
  corrupt:
    "This file looks damaged or isn't a real PDF/Word document. Try re-exporting it, or fill in the fields manually.",
};

/** What the parser found and what it didn't, so a half-filled form isn't a mystery. */
function summarise(fields: ParsedCandidateFields): string {
  const found: string[] = [];
  const missing: string[] = [];
  const check = (label: string, present: boolean) => (present ? found : missing).push(label);
  check("name", Boolean(fields.fullName));
  check("email", Boolean(fields.email));
  check("location", Boolean(fields.location));
  check("experience", fields.experienceYears !== undefined);
  if (fields.skills.length > 0) found.push(`${fields.skills.length} skill${fields.skills.length === 1 ? "" : "s"}`);
  else missing.push("skills");
  return `Detected: ${found.join(", ") || "nothing"}.${missing.length ? ` Not found: ${missing.join(", ")}, so please fill those in.` : ""} Review everything before saving.`;
}

// Prefer the most specific message the server gave: a rejected file explains itself in details.cv,
// while `error` is just "Validation failed".
const errorMessage = (err: unknown) => {
  const data = (err as { data?: { error?: string; details?: { cv?: string } } })?.data;
  return data?.details?.cv ?? data?.error ?? "Couldn't parse this file. Please fill in the fields manually.";
};

export function CvUploadPanel({ onFile, onFields, onAddSkill, skills }: Props) {
  const [parseCv, { isLoading }] = useParseCvMutation();
  const { data: features } = useGetFeaturesQuery();
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "warn" }>();
  const [suggested, setSuggested] = useState<string[]>([]);
  const [aiUsed, setAiUsed] = useState(false);
  const [canImprove, setCanImprove] = useState(false);

  function apply(result: CvParseResult) {
    if (!result.readable || !result.fields) {
      setSuggested([]);
      setCanImprove(false);
      setNotice({ text: UNREADABLE[result.reason ?? "empty"], tone: "warn" });
      return;
    }
    // A new file replaces the previous file's auto-fill outright: if we only
    // filled empty fields, a second (correct) CV could never overwrite a first (wrong) one.
    onFields(result.fields);
    setSuggested(result.fields.suggestedSkills);
    setAiUsed(Boolean(result.diagnostics?.aiUsed));
    setCanImprove(true);
    setNotice({ text: summarise(result.fields), tone: "info" });
  }

  async function run(chosen: File, ai: boolean) {
    setNotice(undefined);
    try {
      apply(await parseCv({ file: chosen, ai }).unwrap());
    } catch (err) {
      // An AI failure keeps whatever the first, non-AI pass already filled in.
      setNotice({ text: errorMessage(err), tone: "warn" });
      if (!ai) setCanImprove(false);
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    setFile(chosen);
    onFile(chosen);
    setNotice(undefined);
    setSuggested([]);
    setCanImprove(false);
    setAiUsed(false);
    if (chosen) await run(chosen, false);
  }

  const pending = suggested.filter((s) => !skills.includes(s));

  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-slate-300 p-4">
      <label htmlFor="cv-upload" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <FiUploadCloud className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Upload CV (optional)
      </label>
      <input
        id="cv-upload"
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        disabled={isLoading}
        className="w-full min-w-0 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60"
      />
      {isLoading && <p className="text-xs text-slate-500">Reading CV and detecting fields...</p>}
      {notice && (
        <p role="status" className={`text-xs ${notice.tone === "warn" ? "text-amber-600" : "text-slate-600"}`}>
          {notice.text}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mt-1">
          <p className="mb-1 text-xs text-slate-500">Also listed in the CV (click to add):</p>
          <div className="flex flex-wrap gap-1.5">
            {pending.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => onAddSkill(skill)}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium capitalize text-slate-700 hover:bg-slate-50"
              >
                <FiPlus className="h-3 w-3" aria-hidden="true" />
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {features?.ai && file && canImprove && !aiUsed && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" disabled={isLoading} onClick={() => run(file, true)}>
            Improve with AI
          </Button>
          <span className="text-xs text-slate-400">Sends this CV's text to the AI provider.</span>
        </div>
      )}
      {aiUsed && <p className="text-xs text-slate-400">Refined with AI. Please still review the fields.</p>}

      <p className="text-xs text-slate-400">Accepts .pdf or .docx, up to 5MB.</p>
    </div>
  );
}
