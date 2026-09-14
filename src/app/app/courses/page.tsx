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

export default function CoursesPage() {
  const { state, mutate, allowed } = useApp();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(state.departments[0]?.id ?? "d1");
  const [years, setYears] = useState("4");
  const [credits, setCredits] = useState("4");

  return (
    <Guard module="courses">
      <PageHeader
        title="Courses"
        note="Degree programmes and subject papers used in timetable, exams, and attendance."
        action={
          allowed("courses", "write") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add course</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New course</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={pick(setDepartmentId)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Years</Label>
                      <Input value={years} onChange={(e) => setYears(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Credits</Label>
                      <Input value={credits} onChange={(e) => setCredits(e.target.value)} />
                    </div>
                  </div>
                  <Button
                    className="bg-[#C41E3A] text-white"
                    onClick={() => {
                      mutate((draft) => {
                        draft.courses.push({
                          id: uid("c"),
                          code,
                          name,
                          departmentId,
                          years: Number(years) || 1,
                          credits: Number(credits) || 0,
                        });
                        return `Added course ${name}.`;
                      }, "courses", code);
                      setOpen(false);
                    }}
                  >
                    Save course
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <SearchTable
        rows={state.courses}
        empty="No course found."
        filter={(row, q) => !q || `${row.name} ${row.code}`.toLowerCase().includes(q)}
        columns={[
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "name", header: "Name", cell: (r) => r.name },
          {
            key: "dept",
            header: "Department",
            cell: (r) => state.departments.find((d) => d.id === r.departmentId)?.name,
          },
          { key: "years", header: "Years", cell: (r) => r.years },
          { key: "credits", header: "Credits", cell: (r) => r.credits },
        ]}
      />
    </Guard>
  );
}
