import { getSkillColorClasses } from "../../lib/skillColor";

interface Props {
  skills: string[];
  highlight?: Set<string>;
  max?: number;
}

export function SkillChips({ skills, highlight, max }: Props) {
  const shown = max ? skills.slice(0, max) : skills;
  const remaining = max && skills.length > max ? skills.length - max : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((skill) => {
        const isHighlighted = highlight?.has(skill.toLowerCase());
        return (
          <span
            key={skill}
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${
              isHighlighted
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300"
                : getSkillColorClasses(skill)
            }`}
          >
            {skill}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
