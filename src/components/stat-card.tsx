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
    gold: "bg-secondary/25 text-primary",
    red: "bg-primary/10 text-primary",
    cream: "bg-muted text-primary",
    maroon: "bg-primary text-secondary",
  }[tone];
  return (
    <Card className="erp-shadow border-0 ring-1 ring-border/80">
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">{value}</p>
          {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
        </div>
        {icon ? <span className={cn("flex size-11 items-center justify-center rounded-2xl", iconWrap)}>{icon}</span> : null}
      </CardContent>
    </Card>
  );
}

export function SectionCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("erp-shadow border-0 ring-1 ring-border/80", className)}>
      <CardContent className="pt-5">
        <h2 className="mb-3 text-base font-semibold text-primary">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}
