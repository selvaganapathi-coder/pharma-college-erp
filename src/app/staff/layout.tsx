"use client";

import type { ReactNode } from "react";
import { PortalGuard, PortalShell } from "@/components/portal/portal-shell";
import { STAFF_BOTTOM, STAFF_NAV } from "@/lib/nav";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGuard portal="staff">
      <PortalShell portal="staff" groups={STAFF_NAV} search bottomNav={STAFF_BOTTOM}>
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
