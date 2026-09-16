"use client";

import { useApp } from "@/lib/app-context";
import { resolveRef, type RefKind } from "@/lib/references";

export function RefLabel({
  kind,
  id,
  fallback,
}: {
  kind: RefKind;
  id?: string | null;
  fallback?: string;
}) {
  const { state, ready } = useApp();
  if (!ready) return <span className="text-muted-foreground">Loading…</span>;
  const { label, missing } = resolveRef(state, kind, id);
  if (!id) return <span className="text-muted-foreground">{fallback ?? "Not assigned"}</span>;
  if (missing) return <span className="text-muted-foreground">{fallback ?? label}</span>;
  return <span>{label}</span>;
}

export function DepartmentLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="department" id={id} />;
}
export function CourseLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="course" id={id} />;
}
export function SectionLabel({ id, short }: { id?: string | null; short?: boolean }) {
  const { state, ready } = useApp();
  if (short) {
    if (!ready) return <span className="text-muted-foreground">Loading…</span>;
    if (!id) return <span className="text-muted-foreground">Not assigned</span>;
    const section = state.sections.find((s) => s.id === id);
    if (!section) return <span className="text-muted-foreground">Unknown Section</span>;
    return <span>{section.name}</span>;
  }
  return <RefLabel kind="section" id={id} />;
}

export function BatchLabel({ label, sectionId }: { label?: string | null; sectionId?: string | null }) {
  const { state, ready } = useApp();
  if (!ready) return <span className="text-muted-foreground">Loading…</span>;
  const section = state.sections.find((s) => s.id === sectionId);
  const text = label?.trim() || (section ? `${section.batch || `Year ${section.year}`}` : "");
  if (!text) return <span className="text-muted-foreground">Not assigned</span>;
  return <span>{text}</span>;
}
export function StudentLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="student" id={id} />;
}
export function StaffLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="staff" id={id} />;
}
export function SubjectLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="subject" id={id} />;
}
export function RouteLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="route" id={id} />;
}
export function BookLabel({ id }: { id?: string | null }) {
  return <RefLabel kind="book" id={id} />;
}
