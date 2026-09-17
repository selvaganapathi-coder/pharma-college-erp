import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileActionBar({
  children,
  className,
  sticky,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        sticky && "sticky bottom-16 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
