"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { CourseSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Section } from "@/lib/types";

export default function SectionsPage() {
  const { state, save, remove, allowed } = useApp();
  const canWrite = allowed("sections", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Section | null>(null);

  return (
    <Guard module="sections">
      <PageHeader
        title="Sections"
        note="A section is a class group. First pick the programme course, then set year, room, and seats."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                const course = state.courses.find((c) => c.kind === "programme");
                setForm({
                  id: uid("s"),
                  name: "",
                  courseId: course?.id ?? "",
                  year: 1,
                  room: "",
                  capacity: 40,
                });
                setOpen(true);
              }}
            >
              Add section
            </Button>
          ) : null
        }
      />
      <DataTable
        rows={state.sections}
        empty="No sections yet. Add a class section after a programme."
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.room}`.toLowerCase().includes(q)}
        onEdit={(r) => {
          setForm(r);
          setOpen(true);
        }}
        onDelete={(r) => void remove("sections", r.id, `Deleted section ${r.name}.`)}
        columns={[
          { key: "name", header: "Section", cell: (r) => r.name },
          { key: "course", header: "Course", cell: (r) => state.courses.find((c) => c.id === r.courseId)?.name },
          { key: "year", header: "Year", cell: (r) => r.year },
          { key: "room", header: "Room", cell: (r) => r.room },
          { key: "cap", header: "Seats", cell: (r) => r.capacity },
          { key: "n", header: "Students", cell: (r) => state.students.filter((s) => s.sectionId === r.id).length },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Section</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <CourseSelect
                courses={state.courses}
                kind="programme"
                value={form.courseId}
                onChange={(id) => setForm({ ...form, courseId: id })}
              />
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Room</Label>
                  <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Seats</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                </div>
              </div>
              <Button
                disabled={!form.name}
                onClick={async () => {
                  await save("sections", form, `Saved section ${form.name}.`);
                  setOpen(false);
                }}
              >
                Save section
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
