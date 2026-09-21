import { ReactNode } from "react";
import { TenantSelect } from "./TenantSelect";

interface Props {
  title: string;
  primaryAction?: ReactNode;
  showTenantSelect?: boolean;
  summaryCards?: ReactNode;
  toolbar?: ReactNode;
  /** Full-width content between the toolbar and the table (e.g. the Ask-AI search). */
  belowToolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function ListPageLayout({
  title,
  primaryAction,
  showTenantSelect = false,
  summaryCards,
  toolbar,
  belowToolbar,
  children,
  footer,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <div className="flex items-center gap-2">
          {showTenantSelect && <TenantSelect />}
          {primaryAction}
        </div>
      </div>

      {summaryCards && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">{summaryCards}</div>
      )}

      {toolbar && (
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          {toolbar}
        </div>
      )}

      {belowToolbar}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">{children}</div>
        {footer}
      </div>
    </div>
  );
}
