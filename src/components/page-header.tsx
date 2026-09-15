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
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1 w-10 rounded-full bg-secondary" />
        <h1 className="text-2xl font-semibold tracking-tight text-primary">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{note}</p>
      </div>
      {action}
    </div>
  );
}
