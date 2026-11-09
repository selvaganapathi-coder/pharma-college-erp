"use client";

import { Suspense } from "react";
import { LibraryDesk } from "@/components/library/library-desk";

export default function LibrarianHome() {
  return (
    <Suspense fallback={null}>
      <LibraryDesk mode="desk" />
    </Suspense>
  );
}
