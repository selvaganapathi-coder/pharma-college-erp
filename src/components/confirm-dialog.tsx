"use client";

import { FormDialog } from "@/components/form-dialog";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onCancel()}
      title={title}
      description={message}
      size="sm"
      saving={loading}
      submitLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onCancel={onCancel}
      onSubmit={onConfirm}
    >
      <p className="text-sm text-muted-foreground">This action can be reversed later from archived records if the module supports restore.</p>
    </FormDialog>
  );
}
