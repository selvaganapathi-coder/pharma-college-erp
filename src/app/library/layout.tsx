"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";

export default function LibrarianLayout({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "librarian") router.replace(user ? portalHome(user.role) : "/");
  }, [ready, user, router]);

  if (!ready || user?.role !== "librarian") {
    return (
      <div className="min-h-dvh bg-background p-6">
        <LoadingState label={!ready ? "Checking your session…" : "Opening the library…"} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <BrandMark size="sm" />
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-primary">{user.name}</p>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            Log out
          </Button>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
