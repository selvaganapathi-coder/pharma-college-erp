"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { CourseSelect, SectionSelect, StaffSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { DAYS, PERIODS, type TimetableSlot } from "@/lib/types";

export default function TimetablePage() {
  const { state, save, remove, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const defaultSection = sid
    ? state.students.find((s) => s.id === sid)?.sectionId ?? state.sections[0]?.id
    : state.sections[0]?.id;
  const [sectionId, setSectionId] = useState(defaultSection ?? "");
  const canWrite = allowed("timetable", "write") && !sid;
  const [edit, setEdit] = useState<{ day: string; period: string; slot?: TimetableSlot } | null>(null);

  const slots = useMemo(() => state.timetable.filter((t) => t.sectionId === sectionId), [state.timetable, sectionId]);
  const section = state.sections.find((s) => s.id === sectionId);
  const programme = state.courses.find((c) => c.id === section?.courseId);

  function cell(day: string, period: string) {
    return slots.find((s) => s.day === day && s.period === period);
  }

  return (
    <Guard module="timetable">
      <PageHeader
        title="Timetable"
        note="Pick a section. Staff can tap a cell to set subject, teacher, and room. Students see their class only."
      />
      <div className="mb-4 max-w-xs">
        <SectionSelect sections={state.sections} value={sectionId} onChange={setSectionId} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[860px] text-sm text-primary">
          <thead className="bg-secondary">
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
              <tr key={p} className="border-t border-border">
                <td className="p-3 font-semibold">{p}</td>
                {DAYS.map((d) => {
                  const slot = cell(d, p);
                  const course = state.courses.find((c) => c.id === slot?.courseId);
                  const staff = state.staff.find((t) => t.id === slot?.staffId);
                  return (
                    <td key={d} className="p-2 align-top">
                      <button
                        type="button"
                        disabled={!canWrite}
                        className="w-full rounded-lg border border-border bg-accent p-2 text-left"
                        onClick={() => setEdit({ day: d, period: p, slot })}
                      >
                        {slot ? (
                          <>
                            <p className="font-medium">{course?.name}</p>
                            <p className="text-xs">{staff?.name}</p>
                            <p className="text-xs">{slot.room}</p>
                          </>
                        ) : (
                          <span className="text-xs">{canWrite ? "Tap to add" : "Free"}</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.day} · {edit?.period}
            </DialogTitle>
          </DialogHeader>
          {edit ? (
            <SlotForm
              sectionId={sectionId}
              departmentId={programme?.departmentId}
              day={edit.day}
              period={edit.period}
              slot={edit.slot}
              onClose={() => setEdit(null)}
              onSave={async (slot) => {
                await save("timetable", slot, `Set ${slot.day} ${slot.period} for ${state.sections.find((s) => s.id === sectionId)?.name ?? "section"}.`);
                setEdit(null);
              }}
              onDelete={
                edit.slot
                  ? async () => {
                      await remove("timetable", edit.slot!.id, `Cleared ${edit.day} ${edit.period}.`);
                      setEdit(null);
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}

function SlotForm({
  sectionId,
  departmentId,
  day,
  period,
  slot,
  onSave,
  onDelete,
  onClose,
}: {
  sectionId: string;
  departmentId?: string;
  day: string;
  period: string;
  slot?: TimetableSlot;
  onSave: (slot: TimetableSlot) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [courseId, setCourseId] = useState(slot?.courseId ?? "");
  const [staffId, setStaffId] = useState(slot?.staffId ?? "");
  const [room, setRoom] = useState(slot?.room ?? "");
  const subject = state.courses.find((c) => c.id === courseId);

  return (
    <div className="space-y-3">
      <CourseSelect
        courses={state.courses}
        departmentId={subject?.departmentId ?? departmentId}
        kind="subject"
        value={courseId}
        onChange={(id) => {
          setCourseId(id);
          const c = state.courses.find((x) => x.id === id);
          const teacher = state.staff.find((t) => t.courseIds.includes(id) || t.departmentId === c?.departmentId);
          if (teacher) setStaffId(teacher.id);
        }}
      />
      <StaffSelect
        staff={state.staff}
        departmentId={subject?.departmentId ?? departmentId}
        value={staffId}
        onChange={setStaffId}
      />
      <div className="space-y-1">
        <Label>Room</Label>
        <Input value={room} onChange={(e) => setRoom(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button
          disabled={!courseId || !staffId}
          onClick={() =>
            onSave({
              id: slot?.id ?? uid("tt"),
              sectionId,
              day,
              period,
              courseId,
              staffId,
              room,
            })
          }
        >
          Save slot
        </Button>
        {onDelete ? (
          <Button variant="outline" onClick={onDelete}>
            Clear
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
