"use client";

import { Suspense } from "react";
import { LibraryDesk } from "@/components/library/library-desk";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LibraryDesk mode="student" />
    </Suspense>
  );
}
