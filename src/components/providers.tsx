"use client";

import { useEffect, type ReactNode } from "react";
import { AppProvider } from "@/lib/app-context";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return (
    <AppProvider>
      {children}
      <Toaster />
    </AppProvider>
  );
}
