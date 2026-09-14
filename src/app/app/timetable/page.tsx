"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { pick } from "@/lib/pick";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = ["9:00 AM", "10:00 AM", "11:15 AM", "12:15 PM"];

export default function TimetablePage() {
  const { state, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const defaultSection = sid
    ? state.students.find((s) => s.id === sid)?.sectionId ?? state.sections[0]?.id
    : state.sections[0]?.id;
  const [sectionId, setSectionId] = useState(defaultSection ?? "");

  const slots = useMemo(
    () => state.timetable.filter((t) => t.sectionId === sectionId),
    [state.timetable, sectionId],
  );

  function cell(day: string, period: string) {
    const slot = slots.find((s) => s.day === day && s.period === period);
    if (!slot) return <span className="text-xs text-[#6B4A1F]">Free</span>;
    const course = state.courses.find((c) => c.id === slot.courseId);
    const staff = state.staff.find((t) => t.id === slot.staffId);
    return (
      <div>
        <p className="font-medium text-[#8B1528]">{course?.name}</p>
        <p className="text-xs text-[#6B4A1F]">{staff?.name}</p>
        <p className="text-xs">{slot.room}</p>
      </div>
    );
  }

  return (
    <Guard module="timetable">
      <PageHeader
        title="Timetable"
        note="See the week plan for a section. Students and parents see their own class first."
      />
      <div className="mb-4 max-w-xs">
        <Select value={sectionId} onValueChange={pick(setSectionId)}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Pick a section" />
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
      <div className="overflow-x-auto rounded-xl border border-[#F0C94A] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#FFF3C4] text-[#7A1F1F]">
            <tr>
              <th className="p-3 text-left">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="p-3 text-left">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p} className="border-t border-[#F0C94A]">
                <td className="p-3 font-medium">{p}</td>
                {DAYS.map((d) => (
                  <td key={d} className="p-3 align-top">
                    {cell(d, p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Guard>
  );
}
