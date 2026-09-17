import { KeyboardEvent, useState } from "react";
import { FiX } from "react-icons/fi";

interface Props {
  label: string;
  value: string[];
  onChange: (skills: string[]) => void;
  error?: string;
  required?: boolean;
}

export function SkillsInput({ label, value, onChange, error, required }: Props) {
  const [draft, setDraft] = useState("");

  function addSkill() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!value.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="skills-input" className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div
        className={`flex w-full min-w-0 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 ${
          error ? "border-red-400" : "border-slate-300 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600"
        }`}
      >
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700"
          >
            {skill}
            <button
              type="button"
              aria-label={`Remove ${skill}`}
              onClick={() => onChange(value.filter((s) => s !== skill))}
              className="text-brand-500 hover:text-brand-700"
            >
              <FiX className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="skills-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addSkill}
          placeholder={value.length === 0 ? "Type a skill and press Enter" : "Add another..."}
          className="min-w-[140px] flex-1 border-none px-1 py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
