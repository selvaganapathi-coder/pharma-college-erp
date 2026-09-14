"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SearchTable } from "@/components/search-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";
import { pick } from "@/lib/pick";
import type { Student } from "@/lib/types";

const blank: Omit<Student, "id"> = {
  rollNo: "",
  name: "",
  email: "",
  phone: "",
  gender: "Female",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  departmentId: "d1",
  courseId: "c1",
  sectionId: "s1",
  year: 1,
  address: "",
  status: "active",
};

export default function StudentsPage() {
  const { state, mutate, allowed } = useApp();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const canWrite = allowed("students", "write");

  function save() {
    mutate((draft) => {
      draft.students.unshift({ ...form, id: uid("st") });
      return `Added student ${form.name} (${form.rollNo}).`;
    }, "students", form.rollNo);
    setOpen(false);
    setForm(blank);
  }

  return (
    <Guard module="students">
      <PageHeader
        title="Student records"
        note="Keep roll number, parent phone, course, and section in one file. Staff can add a new student."
        action={
          canWrite ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add student</DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New student</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["rollNo", "Roll number"],
                      ["name", "Full name"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                      ["parentName", "Parent name"],
                      ["parentPhone", "Parent phone"],
                      ["parentEmail", "Parent email"],
                      ["address", "Address"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <Label>{label}</Label>
                      <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <Label>Course</Label>
                    <Select value={form.courseId} onValueChange={pick((v) => setForm({ ...form, courseId: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Section</Label>
                    <Select value={form.sectionId} onValueChange={pick((v) => setForm({ ...form, sectionId: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.sections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="bg-[#C41E3A] text-white" onClick={save}>
                  Save student
                </Button>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <SearchTable
        rows={state.students}
        empty="No student matches this search."
        filter={(row, q) =>
          !q || `${row.name} ${row.rollNo} ${row.email} ${row.parentName}`.toLowerCase().includes(q)
        }
        columns={[
          { key: "roll", header: "Roll no.", cell: (r) => r.rollNo },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "course", header: "Course", cell: (r) => state.courses.find((c) => c.id === r.courseId)?.name },
          { key: "sec", header: "Section", cell: (r) => state.sections.find((s) => s.id === r.sectionId)?.name },
          { key: "parent", header: "Parent", cell: (r) => `${r.parentName} · ${r.parentPhone}` },
          { key: "status", header: "Status", cell: (r) => r.status },
        ]}
      />
    </Guard>
  );
}
