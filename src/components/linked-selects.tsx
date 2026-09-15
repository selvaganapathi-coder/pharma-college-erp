"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pick } from "@/lib/pick";
import type { Course, Department, Section, Staff } from "@/lib/types";

export function DepartmentSelect({
  departments,
  value,
  onChange,
}: {
  departments: Department[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Field label="Department">
      <Select value={value || null} onValueChange={pick(onChange)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pick department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function CourseSelect({
  courses,
  departmentId,
  value,
  onChange,
  kind,
}: {
  courses: Course[];
  departmentId?: string;
  value: string;
  onChange: (id: string) => void;
  kind?: Course["kind"];
}) {
  const list = courses.filter((c) => {
    if (departmentId && c.departmentId !== departmentId) return false;
    if (kind && c.kind !== kind) return false;
    return true;
  });
  return (
    <Field label="Course">
      <Select value={value || null} onValueChange={pick(onChange)} disabled={!list.length}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={departmentId ? "Pick course" : "Pick department first"} />
        </SelectTrigger>
        <SelectContent>
          {list.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code} · {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SectionSelect({
  sections,
  courseId,
  value,
  onChange,
}: {
  sections: Section[];
  courseId?: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const list = sections.filter((s) => !courseId || s.courseId === courseId);
  return (
    <Field label="Section">
      <Select value={value || null} onValueChange={pick(onChange)} disabled={!list.length}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={courseId ? "Pick section" : "Pick course first"} />
        </SelectTrigger>
        <SelectContent>
          {list.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function StaffSelect({
  staff,
  departmentId,
  value,
  onChange,
}: {
  staff: Staff[];
  departmentId?: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const list = staff.filter((t) => t.status === "active" && (!departmentId || t.departmentId === departmentId));
  return (
    <Field label="Staff">
      <Select value={value || null} onValueChange={pick(onChange)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Pick staff" />
        </SelectTrigger>
        <SelectContent>
          {list.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name} · {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
