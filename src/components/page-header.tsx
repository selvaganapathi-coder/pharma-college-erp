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
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-primary sm:text-[26px] lg:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{note}</p>
      </div>
      {action ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{action}</div> : null}
    </div>
  );
}
