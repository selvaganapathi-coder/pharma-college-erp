"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { DepartmentSelect } from "@/components/linked-selects";
import { DepartmentLabel } from "@/components/ref-label";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import { toast } from "sonner";
import { firstError, validateCourse } from "@/lib/validation";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const { state, save, remove, allowed } = useApp();
  const canWrite = allowed("courses", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Course | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [saving, setSaving] = useState(false);

  return (
    <Guard module="courses">
      <PageHeader
        title="Courses"
        note="Programmes (B.Pharm, D.Pharm) belong to a department. Subject papers are used on the timetable and staff assignments."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({
                  id: uid("c"),
                  code: "",
                  name: "",
                  departmentId: state.departments[0]?.id ?? "",
                  years: 4,
                  credits: 160,
                  kind: "programme",
                });
                setIsNew(true);
                setOpen(true);
              }}
            >
              Add course
            </Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total courses" value={`${state.courses.length}`} />
        <StatCard title="Programmes" value={`${state.courses.filter((c) => c.kind === "programme" || c.years >= 2).length}`} />
        <StatCard title="Departments" value={`${state.departments.length}`} />
        <StatCard title="Students" value={`${state.students.filter((s) => !s.deletedAt).length}`} />
      </div>
      <DataTable
        rows={state.courses}
        empty="No courses yet. Add a programme or subject paper."
        mobileTitle={(r) => r.name}
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.code}`.toLowerCase().includes(q)}
        onEdit={(r) => {
          setForm(r);
          setIsNew(false);
          setOpen(true);
        }}
        onDelete={(r) => void remove("courses", r.id, `Deleted course ${r.name}.`)}
        columns={[
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "kind", header: "Type", cell: (r) => (r.kind === "programme" ? "Programme" : "Subject paper") },
          { key: "dept", header: "Department", cell: (r) => <DepartmentLabel id={r.departmentId} /> },
          { key: "years", header: "Years", cell: (r) => r.years },
          {
            key: "sec",
            header: "Sections",
            cell: (r) => (r.kind === "programme" ? state.sections.filter((s) => s.courseId === r.id).length : "—"),
          },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={isNew ? "Add Course" : "Edit Course"}
        description={form?.kind === "subject" ? "Subject papers appear under their department in timetable and staff forms." : "Programmes are selected when admitting students and creating sections."}
        saving={saving}
        submitLabel={isNew ? "Create Course" : "Save Changes"}
        onSubmit={async () => {
          if (!form) return;
          const err = firstError(validateCourse(form));
          if (err) {
            toast.error(err);
            return;
          }
          setSaving(true);
          try {
            const result = await save("courses", form, `Saved course ${form.name}.`);
            if (!result.ok) return;
            toast.success(isNew ? "Course created successfully." : "Course updated successfully.");
            setOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        {form ? (
          <FormSection title="Course details">
            <DepartmentSelect departments={state.departments} value={form.departmentId} onChange={(id) => setForm({ ...form, departmentId: id })} />
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.kind}
                onValueChange={pick((v) => setForm({ ...form, kind: v as Course["kind"] }))}
                items={{ programme: "Programme (B.Pharm / D.Pharm)", subject: "Subject paper" }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programme">Programme (B.Pharm / D.Pharm)</SelectItem>
                  <SelectItem value="subject">Subject paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Years</Label>
              <Input type="number" value={form.years} onChange={(e) => setForm({ ...form, years: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Credits</Label>
              <Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
            </div>
          </FormSection>
        ) : null}
      </FormDialog>
    </Guard>
  );
}
