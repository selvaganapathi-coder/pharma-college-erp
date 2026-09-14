"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { ModuleKey } from "@/lib/rbac";

export function Guard({ module, write, children }: { module: ModuleKey; write?: boolean; children: ReactNode }) {
  const { ready, allowed } = useApp();
  const router = useRouter();
  const ok = allowed(module, write ? "write" : "read");

  useEffect(() => {
    if (ready && !ok) router.replace("/app");
  }, [ready, ok, router]);

  if (!ok) return <p className="text-sm text-[#6B4A1F]">You cannot open this page.</p>;
  return <>{children}</>;
}
