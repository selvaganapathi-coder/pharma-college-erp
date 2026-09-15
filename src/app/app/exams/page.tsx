"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { CourseSelect, SectionSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Exam } from "@/lib/types";

export default function ExamsPage() {
  const { state, save, remove, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("exams", "write") && !sid;
  const [examId, setExamId] = useState(state.exams[0]?.id ?? "");
  const exam = state.exams.find((e) => e.id === examId) ?? state.exams[0];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Exam | null>(null);

  const rows = useMemo(() => {
    const list = sid ? state.students.filter((s) => s.id === sid) : state.students.filter((s) => !exam || s.sectionId === exam.sectionId);
    return list.map((st) => {
      const mark = state.marks.find((m) => m.examId === exam?.id && m.studentId === st.id);
      const score = mark?.marks ?? 0;
      const max = exam?.maxMarks ?? 30;
      const pct = max ? Math.round((score / max) * 100) : 0;
      const grade = pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "F";
      return { ...st, score, grade, pct, markId: mark?.id };
    });
  }, [state.students, state.marks, exam, sid]);

  return (
    <Guard module="exams">
      <PageHeader
        title="Exam marks"
        note="Create a paper for a section and subject. Enter marks. Lock the paper when the list is final. Students see only their marks."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({
                  id: uid("e"),
                  name: "",
                  courseId: state.courses.find((c) => c.kind === "subject")?.id ?? "",
                  sectionId: state.sections[0]?.id ?? "",
                  date: new Date().toISOString().slice(0, 10),
                  maxMarks: 30,
                  locked: false,
                });
                setOpen(true);
              }}
            >
              New exam
            </Button>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {state.exams.map((e) => (
          <Button
            key={e.id}
            size="sm"
            variant={e.id === (exam?.id ?? examId) ? "default" : "outline"}
            onClick={() => setExamId(e.id)}
          >
            {e.name}
            {e.locked ? " · locked" : ""}
          </Button>
        ))}
      </div>
      {exam ? (
        <p className="mb-3 text-sm">
          {exam.date} · {state.courses.find((c) => c.id === exam.courseId)?.name} · max {exam.maxMarks}
          {canWrite ? (
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => void save("exams", { ...exam, locked: !exam.locked }, exam.locked ? "Unlocked exam." : "Locked exam.")}
            >
              {exam.locked ? "Unlock" : "Lock paper"}
            </Button>
          ) : null}
          {canWrite ? (
            <Button size="sm" variant="ghost" onClick={() => void remove("exams", exam.id, `Deleted exam ${exam.name}.`)}>
              Delete exam
            </Button>
          ) : null}
        </p>
      ) : null}
      <DataTable
        rows={rows}
        empty="No students for this paper. Admit students into the section first."
        filter={(row, q) => !q || `${row.name} ${row.rollNo}`.toLowerCase().includes(q)}
        columns={[
          { key: "roll", header: "Roll no.", cell: (r) => r.rollNo },
          { key: "name", header: "Student", cell: (r) => r.name },
          {
            key: "marks",
            header: "Marks",
            cell: (r) =>
              canWrite && exam && !exam.locked ? (
                <Input
                  className="w-24"
                  type="number"
                  defaultValue={r.score}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    void save(
                      "marks",
                      { id: r.markId ?? uid("m"), examId: exam.id, studentId: r.id, marks: value },
                      `Set marks for ${r.name} to ${value}.`,
                    );
                  }}
                />
              ) : (
                r.score
              ),
          },
          { key: "grade", header: "Grade", cell: (r) => r.grade },
          { key: "pct", header: "%", cell: (r) => `${r.pct}%` },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New exam</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <SectionSelect
                sections={state.sections}
                value={form.sectionId}
                onChange={(id) => setForm({ ...form, sectionId: id })}
              />
              <CourseSelect
                courses={state.courses}
                kind="subject"
                value={form.courseId}
                onChange={(id) => setForm({ ...form, courseId: id })}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Max marks</Label>
                  <Input type="number" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} />
                </div>
              </div>
              <Button
                disabled={!form.name}
                onClick={async () => {
                  await save("exams", form, `Created exam ${form.name}.`);
                  setExamId(form.id);
                  setOpen(false);
                }}
              >
                Save exam
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
