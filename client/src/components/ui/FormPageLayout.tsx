import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

interface Props {
  title: string;
  children: ReactNode;
}

export function FormPageLayout({ title, children }: Props) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="mb-5 text-xl font-semibold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
