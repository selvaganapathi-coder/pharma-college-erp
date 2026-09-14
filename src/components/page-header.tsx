import type { ReactNode } from "react";

export function PageHeader({
  title,
  note,
  action,
}: {
  title: string;
  note: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#8B1528]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6B4A1F]">{note}</p>
      </div>
      {action}
    </div>
  );
}
