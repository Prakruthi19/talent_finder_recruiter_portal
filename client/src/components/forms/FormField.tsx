import { InputHTMLAttributes, ReactNode, useId } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  hint?: ReactNode;
}

export function FormField({ label, error, required, hint, id, className = "", ...props }: Props) {
  // Without a generated fallback, a field with no id/name had a <label> that
  // pointed at nothing: clicking the label didn't focus the input and screen
  // readers couldn't associate them.
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={fieldId}
        className={`w-full min-w-0 rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-brand-600 focus:ring-brand-600"
        } ${className}`}
        {...props}
      />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
