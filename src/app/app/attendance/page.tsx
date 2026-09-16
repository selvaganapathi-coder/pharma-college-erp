"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/stat-card";
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
    sid ? state.students.find((s) => s.id === sid)?.sectionId ?? state.sections[0]?.id ?? "" : state.sections[0]?.id ?? "",
  );
  const [courseId, setCourseId] = useState(state.courses.find((c) => c.kind === "subject")?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const students = useMemo(
    () => state.students.filter((s) => !s.deletedAt && s.sectionId === sectionId && s.status === "active" && (!sid || s.id === sid)),
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
        markedBy: user?.staffId ?? user?.id ?? "",
      },
      `Marked ${status} for ${state.students.find((s) => s.id === studentId)?.name ?? "student"} on ${date}.`,
    );
  }

  return (
    <Guard module="attendance">
      <PageHeader
        title="Attendance"
        note="Pick section, then subject paper, then date. Mark present, late, or absent. Parents and students only view."
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="In this list" value={`${students.length}`} />
        <StatCard title="Present" value={`${students.filter((st) => statusOf(st.id) === "present").length}`} />
        <StatCard title="Late" value={`${students.filter((st) => statusOf(st.id) === "late").length}`} />
        <StatCard
          title="Attendance %"
          value={
            students.length
              ? `${Math.round((students.filter((st) => statusOf(st.id) === "present").length / students.length) * 100)}%`
              : "—"
          }
        />
      </div>
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
            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        {students.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No students in this section yet. Admit students first, then mark attendance.
          </p>
        ) : null}
        {students.map((st) => {
          const status = statusOf(st.id);
          return (
            <div
              key={st.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                {st.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={st.photoUrl} alt="" className="size-10 rounded object-cover" />
                ) : null}
                <div>
                  <p className="font-semibold">{st.name}</p>
                  <p className="text-xs text-muted-foreground">{st.rollNo}</p>
                </div>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  {(["present", "late", "absent"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? "default" : "outline"}
                      onClick={() => void setStatus(st.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge>{status}</Badge>
              )}
            </div>
          );
        })}
      </div>
    </Guard>
  );
}
