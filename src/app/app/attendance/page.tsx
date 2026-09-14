"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";
import { pick } from "@/lib/pick";
import type { Attendance } from "@/lib/types";

export default function AttendancePage() {
  const { state, mutate, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const [sectionId, setSectionId] = useState(
    sid ? state.students.find((s) => s.id === sid)?.sectionId ?? "s1" : "s1",
  );
  const [date, setDate] = useState("2026-09-12");
  const students = useMemo(
    () => state.students.filter((s) => s.sectionId === sectionId && (!sid || s.id === sid)),
    [state.students, sectionId, sid],
  );
  const canWrite = allowed("attendance", "write") && !sid;

  function statusOf(studentId: string) {
    return state.attendance.find((a) => a.studentId === studentId && a.date === date)?.status ?? "present";
  }

  function setStatus(studentId: string, status: Attendance["status"]) {
    mutate((draft) => {
      const existing = draft.attendance.find((a) => a.studentId === studentId && a.date === date);
      if (existing) existing.status = status;
      else {
        draft.attendance.push({
          id: uid("att"),
          studentId,
          courseId: "c4",
          date,
          status,
          markedBy: "t1",
        });
      }
      return `Marked ${studentId} ${status} on ${date}.`;
    }, "attendance", studentId);
  }

  return (
    <Guard module="attendance">
      <PageHeader
        title="Attendance"
        note="Mark who came to class. Students and parents can only view their own days."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={sectionId} onValueChange={pick(setSectionId)}>
          <SelectTrigger className="w-48 bg-white">
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
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-[#F0C94A] bg-white px-3 text-sm"
        />
      </div>
      <div className="space-y-2">
        {students.map((st) => {
          const status = statusOf(st.id);
          return (
            <div
              key={st.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F0C94A] bg-white p-3"
            >
              <div>
                <p className="font-medium">{st.name}</p>
                <p className="text-xs text-[#6B4A1F]">{st.rollNo}</p>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  {(["present", "late", "absent"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={status === s ? "default" : "outline"}
                      className={status === s ? "bg-[#C41E3A] text-white" : ""}
                      onClick={() => setStatus(st.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              ) : (
                <Badge className={status === "present" ? "bg-[#EAB308] text-[#4A1C1C]" : "bg-[#C41E3A]"}>
                  {status}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </Guard>
  );
}
