"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { CourseSelect, DepartmentSelect, SectionSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import type { Student } from "@/lib/types";

function blank(dept = "d1", course = "c1", section = "s1"): Student {
  return {
    id: uid("st"),
    rollNo: "",
    name: "",
    email: "",
    phone: "",
    gender: "Female",
    dob: "2006-01-01",
    bloodGroup: "O+",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    departmentId: dept,
    courseId: course,
    sectionId: section,
    year: 1,
    address: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };
}

export default function StudentsPage() {
  const { state, save, remove, allowed, scopedStudentId, upload } = useApp();
  const router = useRouter();
  const sid = scopedStudentId();
  const canWrite = allowed("students", "write") && !sid;
  const rows = useMemo(
    () => (sid ? state.students.filter((s) => s.id === sid) : state.students),
    [state.students, sid],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Student>(blank());

  function openNew() {
    setForm(blank(state.departments[0]?.id, state.courses.find((c) => c.kind === "programme")?.id, state.sections[0]?.id));
    setOpen(true);
  }

  return (
    <Guard module="students">
      <PageHeader
        title="Student records"
        note="Add, edit, view, and delete student files. Pick department, then course, then section. Upload a student photo."
        action={
          canWrite ? (
            <Button className="bg-[#C41E3A] text-[#FFE566]" onClick={openNew}>
              Add student
            </Button>
          ) : null
        }
      />
      <DataTable
        rows={rows}
        empty="No student matches this search."
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.rollNo} ${row.email} ${row.parentName}`.toLowerCase().includes(q)}
        onOpen={(r) => router.push(`/app/students/${r.id}`)}
        onEdit={(r) => {
          setForm(r);
          setOpen(true);
        }}
        onDelete={(r) => void remove("students", r.id, `Deleted student ${r.name}.`)}
        columns={[
          {
            key: "photo",
            header: "Photo",
            cell: (r) =>
              r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                "—"
              ),
          },
          { key: "roll", header: "Roll no.", cell: (r) => r.rollNo },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "course", header: "Course", cell: (r) => state.courses.find((c) => c.id === r.courseId)?.name },
          { key: "sec", header: "Section", cell: (r) => state.sections.find((s) => s.id === r.sectionId)?.name },
          { key: "parent", header: "Parent", cell: (r) => r.parentPhone },
          { key: "status", header: "Status", cell: (r) => r.status },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#FFF8C2] text-[#C41E3A]">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">{rows.some((r) => r.id === form.id) ? "Edit student" : "New student"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoUpload
              label="Student photo"
              value={form.photoUrl}
              onChange={(url) => setForm({ ...form, photoUrl: url })}
              onFile={(file) => upload("students", form.id, file)}
            />
            <div className="space-y-1">
              <Label>Roll number</Label>
              <Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Date of birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Blood group</Label>
              <Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={pick((v) => setForm({ ...form, gender: v as Student["gender"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DepartmentSelect
              departments={state.departments}
              value={form.departmentId}
              onChange={(id) => {
                const course = state.courses.find((c) => c.departmentId === id && c.kind === "programme");
                const section = state.sections.find((s) => s.courseId === course?.id);
                setForm({ ...form, departmentId: id, courseId: course?.id ?? "", sectionId: section?.id ?? "" });
              }}
            />
            <CourseSelect
              courses={state.courses}
              departmentId={form.departmentId}
              kind="programme"
              value={form.courseId}
              onChange={(id) => {
                const course = state.courses.find((c) => c.id === id);
                const section = state.sections.find((s) => s.courseId === id);
                setForm({ ...form, courseId: id, year: course?.years ? 1 : form.year, sectionId: section?.id ?? "" });
              }}
            />
            <SectionSelect
              sections={state.sections}
              courseId={form.courseId}
              value={form.sectionId}
              onChange={(id) => {
                const sec = state.sections.find((s) => s.id === id);
                setForm({ ...form, sectionId: id, year: sec?.year ?? form.year });
              }}
            />
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Admission date</Label>
              <Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Parent name</Label>
              <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Parent phone</Label>
              <Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Parent email</Label>
              <Input value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Bus route</Label>
              <Select
                value={form.busRouteId ?? "none"}
                onValueChange={pick((v) => setForm({ ...form, busRouteId: v === "none" ? undefined : v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bus</SelectItem>
                  {state.routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={pick((v) => setForm({ ...form, status: v as Student["status"] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="bg-[#C41E3A] text-[#FFE566]"
            disabled={!form.rollNo || !form.name}
            onClick={async () => {
              await save("students", form, `Saved student ${form.name} (${form.rollNo}).`);
              setOpen(false);
            }}
          >
            Save student
          </Button>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
