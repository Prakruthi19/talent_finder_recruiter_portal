import { MouseEventHandler, ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    // table-layout:auto (desktop default) sizes columns by content, which is
    // what we want with many columns. But it also means max-width/truncate
    // hints on a cell's content are NOT reliably respected by the browser's
    // column-width algorithm — so on mobile (2-3 visible columns) we force
    // table-layout:fixed + width:100%, which makes column widths purely a
    // function of the widths declared on Th (see w-12/w-14 on Actions
    // columns), guaranteeing the rest of the space goes to the primary
    // column and nothing gets pushed off-screen.
    <table className="w-full min-w-full max-sm:table-fixed sm:w-auto border-separate border-spacing-0">
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] bg-slate-50">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:px-3.5 ${className}`}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="bg-white [&>tr:nth-child(even)]:bg-slate-50/60">{children}</tbody>
  );
}

interface TrProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLTableRowElement>;
  className?: string;
}

export function Tr({ children, onClick, className = "" }: TrProps) {
  return (
    <tr
      onClick={onClick}
      className={`group border-b border-slate-100 transition-colors hover:bg-brand-50/40 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-2 py-2 text-sm text-slate-700 sm:px-3.5 ${className}`}>
      {children}
    </td>
  );
}
