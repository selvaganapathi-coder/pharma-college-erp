import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, XCircle } from "lucide-react";
import type { AlertSeverity, Notice } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<AlertSeverity, { box: string; label: string; Icon: typeof Info }> = {
  INFO: { box: "border-blue-300 bg-blue-50 text-blue-900", label: "INFO", Icon: Info },
  SUCCESS: { box: "border-green-300 bg-green-50 text-green-900", label: "SUCCESS", Icon: CheckCircle2 },
  WARNING: { box: "border-amber-300 bg-amber-50 text-amber-950", label: "WARNING", Icon: AlertTriangle },
  ERROR: { box: "border-red-300 bg-red-50 text-red-900", label: "ERROR", Icon: XCircle },
  URGENT: { box: "border-rose-500 bg-rose-100 text-rose-950", label: "URGENT", Icon: ShieldAlert },
};

export function AlertCard({
  notice,
  actions,
}: {
  notice: Notice;
  actions?: ReactNode;
}) {
  const severity = notice.severity ?? (notice.urgent ? "URGENT" : "INFO");
  const tone = TONE[severity];
  const Icon = tone.Icon;
  const unread = !(notice.readBy ?? []).length ? true : false;
  return (
    <article className={cn("rounded-xl border p-4", tone.box, unread && "ring-1 ring-current/20")}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="text-xs font-bold tracking-wide">{tone.label}</span>
        <h2 className="font-semibold">{notice.title}</h2>
      </div>
      <p className="mt-2 text-sm">{notice.body}</p>
      <p className="mt-2 text-xs opacity-80">
        {notice.audience} · {new Date(notice.createdAt).toLocaleString()} · {notice.createdByName ?? notice.createdBy} · {notice.status}
      </p>
      {notice.deliveryNote ? <p className="mt-1 text-xs">{notice.deliveryNote}</p> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

export function severityRank(s: AlertSeverity) {
  return { URGENT: 0, ERROR: 1, WARNING: 2, INFO: 3, SUCCESS: 4 }[s];
}
