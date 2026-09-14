"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SearchTable } from "@/components/search-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { pick } from "@/lib/pick";

export default function ExamsPage() {
  const { state, mutate, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const [examId, setExamId] = useState(state.exams[0]?.id ?? "e1");
  const exam = state.exams.find((e) => e.id === examId);
  const canWrite = allowed("exams", "write") && !sid;

  const rows = useMemo(() => {
    const list = sid ? state.students.filter((s) => s.id === sid) : state.students;
    return list.map((st) => {
      const mark = state.marks.find((m) => m.examId === examId && m.studentId === st.id);
      const score = mark?.marks ?? 0;
      const max = exam?.maxMarks ?? 30;
      const pct = Math.round((score / max) * 100);
      const grade = pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "F";
      return { ...st, score, grade, pct };
    });
  }, [state.students, state.marks, examId, exam, sid]);

  return (
    <Guard module="exams">
      <PageHeader
        title="Exam marks"
        note="Staff enter marks. The grade is made from the score. Students see only their own papers."
      />
      <div className="mb-4 max-w-md">
        <Select value={examId} onValueChange={pick(setExamId)}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {state.exams.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} · {e.date} · {e.maxMarks} marks
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SearchTable
        rows={rows}
        empty="No marks for this paper."
        filter={(row, q) => !q || `${row.name} ${row.rollNo}`.toLowerCase().includes(q)}
        columns={[
          { key: "roll", header: "Roll no.", cell: (r) => r.rollNo },
          { key: "name", header: "Student", cell: (r) => r.name },
          {
            key: "marks",
            header: "Marks",
            cell: (r) =>
              canWrite ? (
                <Input
                  className="w-24"
                  type="number"
                  defaultValue={r.score}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    mutate((draft) => {
                      const found = draft.marks.find((m) => m.examId === examId && m.studentId === r.id);
                      if (found) found.marks = value;
                      else draft.marks.push({ id: `m-${r.id}-${examId}`, examId, studentId: r.id, marks: value });
                      return `Set marks for ${r.name} to ${value}.`;
                    }, "marks", r.id);
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
      {canWrite ? (
        <p className="mt-3 text-xs text-[#6B4A1F]">Change a mark and click outside the box to save. This writes an audit log.</p>
      ) : null}
    </Guard>
  );
}
