import type { Notice } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle } from "lucide-react";
import type { AlertSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const TONE: Record<AlertSeverity, { box: string; label: string; Icon: typeof Info }> = {
  INFO: { box: "bg-[#2563eb] text-white", label: "INFO", Icon: Info },
  SUCCESS: { box: "bg-[#16a34a] text-white", label: "SUCCESS", Icon: CheckCircle2 },
  WARNING: { box: "bg-[#f59e0b] text-[#422006]", label: "WARNING", Icon: AlertTriangle },
  ERROR: { box: "bg-[#e11d48] text-white", label: "ERROR", Icon: XCircle },
  URGENT: { box: "bg-[#be123c] text-white", label: "URGENT", Icon: ShieldAlert },
};

export function AlertCard({
  notice,
  compact,
  actions,
}: {
  notice: Notice;
  compact?: boolean;
  actions?: ReactNode;
}) {
  const severity = notice.severity ?? (notice.urgent ? "URGENT" : "INFO");
  const tone = TONE[severity];
  const Icon = tone.Icon;
  return (
    <article className={cn("rounded-2xl p-4 shadow-sm", tone.box, compact && "p-3")} role="status">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.14em]">{tone.label}</p>
          <h2 className="font-semibold leading-tight">{notice.title}</h2>
          <p className={cn("mt-1 text-sm opacity-95", compact && "line-clamp-2")}>{notice.body}</p>
          <p className="mt-2 text-[11px] opacity-80">
            {relativeTime(notice.createdAt)}
            {notice.audience ? ` · ${notice.audience}` : ""}
          </p>
        </div>
      </div>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function relativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(delta)) return iso;
  const mins = Math.max(0, Math.round(delta / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString("en-IN");
}

export function severityRank(s: AlertSeverity) {
  return { URGENT: 0, ERROR: 1, WARNING: 2, INFO: 3, SUCCESS: 4 }[s];
}
