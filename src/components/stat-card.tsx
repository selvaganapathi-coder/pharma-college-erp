import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  note,
  icon,
  tone = "gold",
}: {
  title: string;
  value: string;
  note?: string;
  icon?: ReactNode;
  tone?: "gold" | "red" | "cream" | "maroon";
}) {
  const iconWrap = {
    gold: "bg-[#e7f0ff] text-[#1b6de0]",
    red: "bg-[#fdecec] text-[#d92d20]",
    cream: "bg-[#eefbf3] text-[#067647]",
    maroon: "bg-[#fff6e8] text-[#b54708]",
  }[tone];
  return (
    <Card className="rounded-lg border border-[#e6e9ef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <CardContent className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#667085] uppercase">{title}</p>
          <p className="mt-1 break-words text-[22px] leading-none font-semibold tracking-tight text-[#1f2533]">{value}</p>
          {note ? <p className="mt-2 text-xs text-[#8b93a7]">{note}</p> : null}
        </div>
        {icon ? <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", iconWrap)}>{icon}</span> : null}
      </CardContent>
    </Card>
  );
}

export function SectionCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("erp-card", className)}>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-primary sm:text-base">{title}</h2>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
