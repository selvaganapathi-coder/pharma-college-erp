import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileRecordCard({
  photo,
  title,
  subtitle,
  meta,
  rows,
  status,
  actions,
  className,
}: {
  photo?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>
      <div className="flex gap-3">
        {photo ? <div className="shrink-0">{photo}</div> : null}
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold text-primary">{title}</h3>
          {subtitle ? <p className="mt-0.5 break-words text-sm text-muted-foreground">{subtitle}</p> : null}
          {meta ? <p className="mt-0.5 break-all text-xs text-muted-foreground">{meta}</p> : null}
          {status ? <div className="mt-2">{status}</div> : null}
        </div>
      </div>
      {rows?.length ? (
        <dl className="mt-3 space-y-1 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-right break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
