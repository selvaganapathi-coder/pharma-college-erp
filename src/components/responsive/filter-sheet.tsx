"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function FilterSheet({
  children,
  activeCount = 0,
  onReset,
  title = "Filters",
}: {
  children: ReactNode;
  activeCount?: number;
  onReset?: () => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden gap-3 lg:grid lg:grid-cols-4">{children}</div>
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-between rounded-xl"
          onClick={() => setOpen(true)}
          aria-expanded={open}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filters
          </span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{activeCount}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Optional</span>
          )}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[min(85dvh,720px)] overflow-y-auto rounded-t-3xl bg-white p-0">
            <SheetHeader className="border-b border-border/70">
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-3 px-4 py-4">{children}</div>
            <SheetFooter className="flex-row gap-2 border-t border-border/70">
              {onReset ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 flex-1"
                  onClick={() => {
                    onReset();
                  }}
                >
                  Reset
                </Button>
              ) : null}
              <Button type="button" className="min-h-11 flex-1" onClick={() => setOpen(false)}>
                Apply filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
