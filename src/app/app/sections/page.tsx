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

export default function SectionsPage() {
  const { state, mutate, allowed } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "c1");
  const [year, setYear] = useState("1");
  const [room, setRoom] = useState("");

  return (
    <Guard module="sections">
      <PageHeader
        title="Sections"
        note="A section is a class group, like B.Pharm 1-A. Timetable and attendance use this."
        action={
          allowed("sections", "write") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add section</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New section</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Course</Label>
                    <Select value={courseId} onValueChange={pick(setCourseId)}>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Year</Label>
                      <Input value={year} onChange={(e) => setYear(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Room</Label>
                      <Input value={room} onChange={(e) => setRoom(e.target.value)} />
                    </div>
                  </div>
                  <Button
                    className="bg-[#C41E3A] text-white"
                    onClick={() => {
                      mutate((draft) => {
                        draft.sections.push({
                          id: uid("s"),
                          name,
                          courseId,
                          year: Number(year) || 1,
                          room,
                        });
                        return `Added section ${name}.`;
                      }, "sections", name);
                      setOpen(false);
                    }}
                  >
                    Save section
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <SearchTable
        rows={state.sections}
        empty="No section found."
        filter={(row, q) => !q || `${row.name} ${row.room}`.toLowerCase().includes(q)}
        columns={[
          { key: "name", header: "Section", cell: (r) => r.name },
          { key: "course", header: "Course", cell: (r) => state.courses.find((c) => c.id === r.courseId)?.name },
          { key: "year", header: "Year", cell: (r) => r.year },
          { key: "room", header: "Room", cell: (r) => r.room },
          {
            key: "count",
            header: "Students",
            cell: (r) => state.students.filter((s) => s.sectionId === r.id).length,
          },
        ]}
      />
    </Guard>
  );
}
