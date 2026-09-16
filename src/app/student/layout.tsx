"use client";

import type { ReactNode } from "react";
import { PortalGuard, PortalShell } from "@/components/portal/portal-shell";
import { STUDENT_BOTTOM, STUDENT_NAV } from "@/lib/nav";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGuard portal="student">
      <PortalShell portal="student" groups={STUDENT_NAV} bottomNav={STUDENT_BOTTOM}>
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
