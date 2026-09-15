"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { CourseSelect, SectionSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Attendance } from "@/lib/types";

export default function AttendancePage() {
  const { state, save, allowed, scopedStudentId, user } = useApp();
  const sid = scopedStudentId();
  const [sectionId, setSectionId] = useState(
    sid ? state.students.find((s) => s.id === sid)?.sectionId ?? "s1" : "s1",
  );
  const [courseId, setCourseId] = useState("c4");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const students = useMemo(
    () => state.students.filter((s) => s.sectionId === sectionId && s.status === "active" && (!sid || s.id === sid)),
    [state.students, sectionId, sid],
  );
  const canWrite = allowed("attendance", "write") && !sid;
  const section = state.sections.find((s) => s.id === sectionId);
  const programme = state.courses.find((c) => c.id === section?.courseId);

  function statusOf(studentId: string): Attendance["status"] {
    return (
      state.attendance.find((a) => a.studentId === studentId && a.date === date && a.courseId === courseId)?.status ??
      "present"
    );
  }

  async function setStatus(studentId: string, status: Attendance["status"]) {
    const existing = state.attendance.find((a) => a.studentId === studentId && a.date === date && a.courseId === courseId);
    await save(
      "attendance",
      {
        id: existing?.id ?? uid("att"),
        studentId,
        courseId,
        sectionId,
        date,
        status,
        markedBy: user?.staffId ?? user?.id ?? "t1",
      },
      `Marked attendance ${status} for ${studentId} on ${date}.`,
    );
  }

  return (
    <Guard module="attendance">
      <PageHeader
        title="Attendance"
        note="Pick section, then subject paper, then date. Mark present, late, or absent. Parents and students only view."
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SectionSelect sections={state.sections} value={sectionId} onChange={setSectionId} />
        <CourseSelect
          courses={state.courses}
          departmentId={programme?.departmentId}
          kind="subject"
          value={courseId}
          onChange={setCourseId}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-full rounded-lg border-2 border-[#C41E3A] bg-white px-3 text-sm text-[#C41E3A]"
          />
        </div>
      </div>
      <div className="space-y-2">
        {students.map((st) => {
          const status = statusOf(st.id);
          return (
            <div
              key={st.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#C41E3A] bg-[#FFF8C2] p-3"
            >
              <div className="flex items-center gap-3">
                {st.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={st.photoUrl} alt="" className="size-10 rounded object-cover" />
                ) : null}
                <div>
                  <p className="font-semibold">{st.name}</p>
                  <p className="text-xs">{st.rollNo}</p>
                </div>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  {(["present", "late", "absent"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? "default" : "outline"}
                      className={status === s ? "bg-[#C41E3A] text-[#FFE566]" : "border-[#C41E3A] text-[#C41E3A]"}
                      onClick={() => void setStatus(st.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge className="bg-[#C41E3A] text-[#FFE566]">{status}</Badge>
              )}
            </div>
          );
        })}
      </div>
    </Guard>
  );
}
