"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { ModuleKey } from "@/lib/rbac";
import { portalHome } from "@/lib/portals";

export function Guard({ module, write, children }: { module: ModuleKey; write?: boolean; children: ReactNode }) {
  const { ready, allowed, user } = useApp();
  const router = useRouter();
  const ok = allowed(module, write ? "write" : "read");

  useEffect(() => {
    if (ready && !ok) router.replace(user ? portalHome(user.role) : "/");
  }, [ready, ok, router, user]);

  if (!ok) return <p className="text-sm text-muted-foreground">You cannot open this page.</p>;
  return <>{children}</>;
}
