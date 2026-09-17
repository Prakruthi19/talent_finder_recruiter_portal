import { MouseEventHandler, ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return <table className="min-w-full border-separate border-spacing-0">{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] bg-slate-50">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-slate-200 px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
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
    <td className={`whitespace-nowrap px-3.5 py-2 text-sm text-slate-700 ${className}`}>
      {children}
    </td>
  );
}
