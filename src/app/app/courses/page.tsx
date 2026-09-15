"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { DepartmentSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const { state, save, remove, allowed } = useApp();
  const canWrite = allowed("courses", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Course | null>(null);

  return (
    <Guard module="courses">
      <PageHeader
        title="Courses"
        note="Programmes (B.Pharm) and subject papers. Subject papers show only under their department when you pick staff or timetable."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({
                  id: uid("c"),
                  code: "",
                  name: "",
                  departmentId: state.departments[0]?.id ?? "",
                  years: 1,
                  credits: 4,
                  kind: "subject",
                });
                setOpen(true);
              }}
            >
              Add course
            </Button>
          ) : null
        }
      />
      <DataTable
        rows={state.courses}
        empty="No courses yet. Add a programme or subject paper."
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.code}`.toLowerCase().includes(q)}
        onEdit={(r) => {
          setForm(r);
          setOpen(true);
        }}
        onDelete={(r) => void remove("courses", r.id, `Deleted course ${r.name}.`)}
        columns={[
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "kind", header: "Type", cell: (r) => r.kind },
          { key: "dept", header: "Department", cell: (r) => state.departments.find((d) => d.id === r.departmentId)?.name },
          { key: "years", header: "Years", cell: (r) => r.years },
          { key: "credits", header: "Credits", cell: (r) => r.credits },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Course</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <DepartmentSelect
                departments={state.departments}
                value={form.departmentId}
                onChange={(id) => setForm({ ...form, departmentId: id })}
              />
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={pick((v) => setForm({ ...form, kind: v as Course["kind"] }))}>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Years</Label>
                  <Input type="number" value={form.years} onChange={(e) => setForm({ ...form, years: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Credits</Label>
                  <Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
                </div>
              </div>
              <Button
                disabled={!form.name}
                onClick={async () => {
                  await save("courses", form, `Saved course ${form.name}.`);
                  setOpen(false);
                }}
              >
                Save course
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
