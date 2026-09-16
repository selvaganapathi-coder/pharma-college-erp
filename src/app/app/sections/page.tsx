"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { CourseSelect, StaffSelect } from "@/components/linked-selects";
import { CourseLabel, DepartmentLabel } from "@/components/ref-label";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { batchLabel } from "@/lib/catalog";
import { getCourseName, getDepartmentName } from "@/lib/references";
import { uid } from "@/lib/store";
import { toast } from "sonner";
import type { Section } from "@/lib/types";

export default function SectionsPage() {
  const { state, save, remove, allowed } = useApp();
  const router = useRouter();
  const canWrite = allowed("sections", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Section | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = state.sections;

  return (
    <Guard module="sections">
      <PageHeader
        title="Sections"
        note="A section is a class group for a programme, batch, and year. Course names are resolved from the course record — never shown as raw IDs."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                const course = state.courses.find((c) => c.kind === "programme") ?? state.courses.find((c) => c.years >= 2);
                setForm({
                  id: uid("s"),
                  name: "",
                  code: "",
                  courseId: course?.id ?? "",
                  batch: "",
                  year: 1,
                  semester: "",
                  academicYear: "",
                  advisorId: "",
                  room: "",
                  capacity: 40,
                  status: "active",
                });
                setIsNew(true);
                setError(null);
                setOpen(true);
              }}
            >
              Add section
            </Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total sections" value={`${rows.length}`} />
        <StatCard title="Active" value={`${rows.filter((r) => (r.status ?? "active") === "active").length}`} />
        <StatCard title="Total students" value={`${state.students.filter((s) => !s.deletedAt).length}`} />
        <StatCard title="Available capacity" value={`${Math.max(0, rows.reduce((s, r) => s + r.capacity, 0) - state.students.filter((s) => !s.deletedAt).length)}`} />
      </div>
      <DataTable
        rows={rows}
        empty="No sections yet. Add a class section after a programme course exists."
        mobileTitle={(r) => `Section ${r.name}`}
        canWrite={canWrite}
        filter={(row, q) => {
          const hay = `${row.name} ${row.code ?? ""} ${row.room} ${batchLabel(row)} ${getCourseName(state, row.courseId)} ${getDepartmentName(state, state.courses.find((c) => c.id === row.courseId)?.departmentId)}`.toLowerCase();
          return !q || hay.includes(q);
        }}
        onOpen={(r) => router.push(`/app/sections/${r.id}`)}
        onEdit={(r) => {
          setForm({ ...r, batch: r.batch ?? "", code: r.code ?? "", semester: r.semester ?? "", academicYear: r.academicYear ?? "", advisorId: r.advisorId ?? "", status: r.status ?? "active" });
          setIsNew(false);
          setError(null);
          setOpen(true);
        }}
        onDelete={(r) => void remove("sections", r.id, `Deleted section ${r.name}.`)}
        columns={[
          { key: "name", header: "Section", cell: (r) => r.name },
          { key: "course", header: "Course", cell: (r) => <CourseLabel id={r.courseId} /> },
          {
            key: "dept",
            header: "Department",
            cell: (r) => <DepartmentLabel id={state.courses.find((c) => c.id === r.courseId)?.departmentId} />,
          },
          { key: "batch", header: "Batch", cell: (r) => batchLabel(r) },
          { key: "sem", header: "Semester", cell: (r) => r.semester || `Year ${r.year}` },
          { key: "room", header: "Room", cell: (r) => r.room || "—" },
          { key: "cap", header: "Students", cell: (r) => `${state.students.filter((s) => s.sectionId === r.id && !s.deletedAt).length} / ${r.capacity}` },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={isNew ? "Add Section" : "Edit Section"}
        description="Link this class group to a programme course. Batch labels such as 2026–2030 are used on student admission."
        error={error}
        saving={saving}
        submitLabel={isNew ? "Create Section" : "Save Changes"}
        onSubmit={async () => {
          if (!form?.name.trim()) {
            setError("Section name is required.");
            return;
          }
          if (!form.courseId || !state.courses.some((c) => c.id === form.courseId)) {
            setError("Select a valid course. Unknown or missing courses cannot be saved.");
            toast.error("This section must reference a real course.");
            return;
          }
          if (!form.batch?.trim()) {
            setError("Batch is required (for example 2026–2030).");
            return;
          }
          setSaving(true);
          try {
            const result = await save("sections", { ...form, batch: batchLabel({ batch: form.batch, year: form.year }) }, `Saved section ${form.name}.`);
            if (!result.ok) {
              setError(result.error ?? "Unable to synchronize changes with the cloud.");
              return;
            }
            toast.success(isNew ? "Section created successfully." : "Section updated successfully.");
            setOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        {form ? (
          <FormSection title="Section details">
            <CourseSelect
              courses={state.courses}
              kind="programme"
              value={form.courseId}
              onChange={(id) => setForm({ ...form, courseId: id })}
            />
            <div className="space-y-1">
              <Label>Section name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="A" />
            </div>
            <div className="space-y-1">
              <Label>Section code</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BPH-A" />
            </div>
            <div className="space-y-1">
              <Label>Batch</Label>
              <Input value={form.batch ?? ""} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="2026–2030" />
              <p className="text-xs text-muted-foreground">Use the intake years, for example 2026–2030. Students pick this batch after the course.</p>
            </div>
            <div className="space-y-1">
              <Label>Year of study</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Semester</Label>
              <Input value={form.semester ?? ""} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="III Semester" />
            </div>
            <div className="space-y-1">
              <Label>Academic year</Label>
              <Input value={form.academicYear ?? ""} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2026–2027" />
            </div>
            <StaffSelect
              staff={state.staff}
              value={form.advisorId ?? ""}
              onChange={(id) => setForm({ ...form, advisorId: id })}
            />
            <div className="space-y-1">
              <Label>Room</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
          </FormSection>
        ) : null}
      </FormDialog>
    </Guard>
  );
}
