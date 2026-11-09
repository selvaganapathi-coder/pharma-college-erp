"use client";

import { Suspense } from "react";
import { LibraryDesk } from "@/components/library/library-desk";

export default function FacultyLibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryDesk mode="faculty" />
    </Suspense>
  );
}
