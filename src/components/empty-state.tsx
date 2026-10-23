import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center sm:py-12">
      <Inbox className="mx-auto size-8 text-primary" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-primary">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4 min-h-11" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading records…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold text-primary">{label}</p>
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-white sm:h-14" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-8 text-center">
      <h2 className="font-semibold text-destructive">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {onRetry ? (
        <Button className="mt-4 min-h-11" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
