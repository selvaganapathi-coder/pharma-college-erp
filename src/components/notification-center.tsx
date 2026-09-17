"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { AlertCard } from "@/components/alert-card";
import { Button } from "@/components/ui/button";
import type { Notice } from "@/lib/types";

export function NotificationCenter({
  notices,
  unread,
  onOpenAll,
  onRead,
}: {
  notices: Notice[];
  unread: number;
  onOpenAll: () => void;
  onRead: (notice: Notice) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex size-11 items-center justify-center rounded-full border border-border bg-card"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4 text-primary" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-14 z-50 max-h-[min(70dvh,520px)] overflow-y-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/8 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(100vw-2rem,360px)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            <div className="flex items-center">
              <Button size="sm" variant="ghost" className="min-h-11" onClick={onOpenAll}>
                View all
              </Button>
              <Button size="icon" variant="ghost" className="size-11" aria-label="Close notifications" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
          {notices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No unread alerts.</p>
          ) : (
            notices.map((n) => (
              <button key={n.id} type="button" className="mb-2 block w-full text-left" onClick={() => onRead(n)}>
                <AlertCard notice={n} compact />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
