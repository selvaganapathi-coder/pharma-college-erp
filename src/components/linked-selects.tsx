"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pick } from "@/lib/pick";
import {
  batchLabel,
  batchesForCourse,
  matchBatchOption,
  programmesForCollege,
  programmesForDepartment,
  sectionsForCourseBatch,
} from "@/lib/catalog";
import { getSectionName } from "@/lib/references";
import type { AppState, Course, Department, Section, Staff } from "@/lib/types";

export function NamedSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  empty,
  disabled,
  loading,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  empty?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const valid = options.some((o) => o.id === value);
  const items = Object.fromEntries(options.map((o) => [o.id, o.label]));
  return (
    <Field label={label}>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {!loading && options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {empty ?? "No options available."}
        </p>
      ) : (
        <Select
          value={valid ? value : null}
          onValueChange={pick(onChange)}
          items={items}
          disabled={disabled || loading || !options.length}
        >
          <SelectTrigger className="h-11 w-full min-h-11">
            <SelectValue placeholder={placeholder}>
              {(selected: string | null) => (selected ? (items[selected] ?? placeholder) : placeholder)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

export function DepartmentSelect({
  departments,
  value,
  onChange,
  loading,
}: {
  departments: Department[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  return (
    <NamedSelect
      label="Department"
      value={value}
      onChange={onChange}
      loading={loading}
      placeholder="Select department"
      empty="No departments yet. Add a department before admitting students."
      options={departments.map((d) => ({ id: d.id, label: d.name }))}
    />
  );
}

export function CourseSelect({
  courses,
  departmentId,
  value,
  onChange,
  kind,
  loading,
  label = "Course",
  requireDepartment,
}: {
  courses: Course[];
  departmentId?: string;
  value: string;
  onChange: (id: string) => void;
  kind?: Course["kind"];
  loading?: boolean;
  label?: string;
  requireDepartment?: boolean;
}) {
  const list = (() => {
    if (requireDepartment && !departmentId) return [];
    if (kind === "programme") {
      return departmentId ? programmesForDepartment(courses, departmentId) : programmesForCollege(courses);
    }
    return courses.filter((c) => {
      if (departmentId && c.departmentId !== departmentId) return false;
      if (kind && c.kind !== kind) return false;
      return true;
    });
  })();
  const placeholder = requireDepartment && !departmentId
    ? "Select department first"
    : departmentId
      ? loading
        ? "Loading courses..."
        : "Select course"
      : "Select course";
  const empty = requireDepartment && !departmentId
    ? "Select a department first."
    : departmentId
      ? kind === "subject"
        ? "No subject papers available for this department."
        : "No courses available for this department."
      : "No courses on file.";
  return (
    <NamedSelect
      label={label}
      value={value}
      onChange={onChange}
      loading={loading}
      disabled={requireDepartment && !departmentId}
      placeholder={placeholder}
      empty={empty}
      options={list.map((c) => ({ id: c.id, label: c.code ? `${c.code} · ${c.name}` : c.name }))}
    />
  );
}

export function BatchSelect({
  sections,
  courseId,
  value,
  onChange,
  loading,
}: {
  sections: Section[];
  courseId?: string;
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  const options = courseId ? batchesForCourse(sections, courseId) : [];
  return (
    <NamedSelect
      label="Batch"
      value={matchBatchOption(options, value)}
      onChange={onChange}
      loading={loading}
      disabled={!courseId}
      placeholder={courseId ? (loading ? "Loading batches..." : "Select batch") : "Select course first"}
      empty={courseId ? "No batches available for this course. Add a section with a batch label." : "Select a course first."}
      options={options}
    />
  );
}

export function SectionSelect({
  sections,
  courses,
  courseId,
  batch,
  value,
  onChange,
  loading,
}: {
  sections: Section[];
  courses?: Course[];
  courseId?: string;
  batch?: string;
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
}) {
  const list =
    courseId === undefined
      ? sections
      : courseId
        ? sectionsForCourseBatch(sections, courseId, batch || undefined)
        : [];
  const state = { sections, courses: courses ?? [] } as Pick<AppState, "sections" | "courses">;
  return (
    <NamedSelect
      label="Section"
      value={value}
      onChange={onChange}
      loading={loading}
      disabled={courseId !== undefined && !courseId}
      placeholder={
        courseId
          ? loading
            ? "Loading sections..."
            : "Select section"
          : courseId === undefined
            ? "Select section"
            : "Select course first"
      }
      empty={
        courseId
          ? batch
            ? "No sections available for this batch."
            : "No sections available for this course."
          : "Select a course first."
      }
      options={list.map((s) => ({
        id: s.id,
        label: courses ? getSectionName(state, s.id) : `${s.name} · ${batchLabel(s)}`,
      }))}
    />
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
    <NamedSelect
      label="Staff"
      value={value}
      onChange={onChange}
      placeholder="Select staff"
      empty="No staff available for this department."
      options={list.map((t) => ({ id: t.id, label: `${t.name} · ${t.title}` }))}
    />
  );
}

export function StudentSelect({
  students,
  value,
  onChange,
}: {
  students: { id: string; name: string; rollNo: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <NamedSelect
      label="Student"
      value={value}
      onChange={onChange}
      placeholder="Select student"
      empty="No students on file."
      options={students.map((s) => ({ id: s.id, label: `${s.name} (${s.rollNo})` }))}
    />
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
