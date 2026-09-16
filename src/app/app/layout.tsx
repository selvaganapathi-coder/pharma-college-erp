"use client";

import { PortalGuard, PortalShell } from "@/components/portal/portal-shell";
import { ADMIN_NAV } from "@/lib/nav";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGuard portal="admin">
      <PortalShell portal="admin" groups={ADMIN_NAV} search>
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
