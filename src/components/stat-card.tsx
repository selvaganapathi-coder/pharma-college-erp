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
    gold: "bg-[#fff4cc] text-primary",
    red: "bg-[#fde8e8] text-primary",
    cream: "bg-muted text-primary",
    maroon: "bg-primary text-secondary",
  }[tone];
  return (
    <Card className="erp-card">
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 break-words text-[26px] leading-none font-semibold tracking-tight text-primary sm:text-[32px]">{value}</p>
          {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
        </div>
        {icon ? <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", iconWrap)}>{icon}</span> : null}
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
