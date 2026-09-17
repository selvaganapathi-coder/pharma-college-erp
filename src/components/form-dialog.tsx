"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/80 bg-[#fbf7ef]/60 p-3 sm:p-4">
      <div>
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  error,
  saving,
  submitLabel,
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  extraActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  error?: string | null;
  saving?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
  extraActions?: ReactNode;
}) {
  const width =
    size === "sm"
      ? "sm:max-w-md"
      : size === "lg"
        ? "sm:max-w-2xl"
        : size === "xl"
          ? "sm:max-w-3xl"
          : "sm:max-w-lg";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden bg-white p-0 text-left shadow-[0_24px_60px_-24px_rgba(80,20,24,0.35)] ring-1 ring-black/8 sm:w-full sm:max-h-[min(92dvh,880px)]",
          width,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/80 px-4 py-3 pr-12 sm:px-5">
          <DialogTitle className="font-heading text-lg font-semibold text-primary">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
          {error ? (
            <div className="mb-3 whitespace-pre-line rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {children}
        </div>
        {onSubmit || extraActions ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border/80 bg-[#fbf7ef] p-3 sm:flex-row sm:justify-end sm:px-5">
            {extraActions}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={saving}
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </Button>
            {onSubmit ? (
              <Button type="button" className="min-h-11" disabled={saving} onClick={() => void onSubmit()}>
                {saving ? "Saving…" : submitLabel ?? "Save"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
