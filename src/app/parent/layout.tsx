"use client";

import type { ReactNode } from "react";
import { PortalGuard, PortalShell } from "@/components/portal/portal-shell";
import { PARENT_BOTTOM, PARENT_NAV } from "@/lib/nav";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGuard portal="parent">
      <PortalShell portal="parent" groups={PARENT_NAV} bottomNav={PARENT_BOTTOM}>
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
