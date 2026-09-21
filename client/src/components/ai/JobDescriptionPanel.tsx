import { useState } from "react";
import { FiPlus, FiZap } from "react-icons/fi";
import { useGetFeaturesQuery } from "../../api/authApi";
import { useParseJobDescriptionMutation } from "../../api/aiApi";
import { aiErrorMessage } from "../../lib/aiErrors";
import { Button } from "../ui/Button";
import type { JobDescriptionDraft } from "../../types";

interface Props {
  /** Apply the detected values to the form. The recruiter still reviews everything. */
  onDraft: (draft: JobDescriptionDraft) => void;
  onAddSkill: (skill: string) => void;
  /** Skills already on the form, so suggestions don't repeat them. */
  skills: string[];
}

/** "Paste a job description, get a job order to review". Hidden when the server has no AI key. */
export function JobDescriptionPanel({ onDraft, onAddSkill, skills }: Props) {
  const { data: features } = useGetFeaturesQuery();
  const [parse, { isLoading }] = useParseJobDescriptionMutation();
  const [text, setText] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; tone: "info" | "warn" }>();

  if (!features?.ai) return null;

  async function handleClick() {
    setNotice(undefined);
    try {
      const draft = await parse({ text }).unwrap();
      onDraft(draft);
      setSuggested(draft.suggestedSkills);
      const found = [
        draft.title && "title",
        draft.clientName && "client",
        draft.location && "location",
        draft.minExperience !== undefined && "experience",
        draft.numberOfOpenings !== undefined && "openings",
        draft.skills.length > 0 && `${draft.skills.length} skill${draft.skills.length === 1 ? "" : "s"}`,
      ].filter(Boolean);
      setNotice({ text: `Filled in: ${found.join(", ") || "nothing"}. Review every field before saving.`, tone: "info" });
    } catch (err) {
      setNotice({ text: aiErrorMessage(err), tone: "warn" });
    }
  }

  const pending = suggested.filter((s) => !skills.includes(s));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-brand-200 bg-brand-50/40 p-4">
      <label htmlFor="jd-text" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <FiZap className="h-4 w-4 text-brand-500" aria-hidden="true" />
        Paste a job description to auto-fill (optional)
      </label>
      <textarea
        id="jd-text"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the full job description here..."
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" disabled={isLoading || text.trim().length < 40} onClick={handleClick}>
          {isLoading ? "Reading..." : "Auto-fill with AI"}
        </Button>
        <span className="text-xs text-slate-400">Sends the pasted text to the AI provider.</span>
      </div>
      {notice && <p role="status" className={`text-xs ${notice.tone === "warn" ? "text-amber-600" : "text-slate-600"}`}>{notice.text}</p>}
      {pending.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-slate-500">Also mentioned, but not in the skill list yet (click to add):</p>
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
    </div>
  );
}
