"use client";

import { Suspense } from "react";
import { Guard } from "@/components/guard";
import { LibraryDesk } from "@/components/library/library-desk";

export default function LibraryPage() {
  return (
    <Guard module="library">
      <Suspense fallback={null}>
        <LibraryDesk mode="desk" />
      </Suspense>
    </Guard>
  );
}
