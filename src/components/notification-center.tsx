"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
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
        className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card"
        aria-label={`Notifications, ${unread} unread`}
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
        <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,360px)] space-y-2 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            <Button size="sm" variant="ghost" onClick={onOpenAll}>
              View all
            </Button>
          </div>
          {notices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No unread alerts.</p>
          ) : (
            notices.map((n) => (
              <button key={n.id} type="button" className="block w-full text-left" onClick={() => onRead(n)}>
                <AlertCard notice={n} compact />
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
