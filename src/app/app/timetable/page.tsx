"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { CourseSelect, DepartmentSelect, SectionSelect, StaffSelect } from "@/components/linked-selects";
import { FormDialog, FormSection, FieldError } from "@/components/form-dialog";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import { toast } from "sonner";
import { DAYS, PERIODS, type TimetableSlot } from "@/lib/types";
import {
  addMinutes,
  findTimetableConflicts,
  formatClock,
  periodLabel,
  slotTimes,
  toHHmm,
  validateSlotTimes,
} from "@/lib/schedule";
import { getSectionShortName, getStaffName, getSubjectName } from "@/lib/references";

export default function TimetablePage() {
  const { state, save, remove, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const defaultSection = sid
    ? state.students.find((s) => s.id === sid)?.sectionId ?? state.sections[0]?.id
    : state.sections[0]?.id;
  const [sectionId, setSectionId] = useState(defaultSection ?? "");
  const [deptId, setDeptId] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dayTab, setDayTab] = useState("Monday");
  const [view, setView] = useState<"week" | "day">("week");
  const canWrite = allowed("timetable", "write") && !sid;
  const [edit, setEdit] = useState<TimetableSlot | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredSections = useMemo(() => {
    return state.sections.filter((s) => {
      const course = state.courses.find((c) => c.id === s.courseId);
      if (deptId && course?.departmentId !== deptId) return false;
      if (courseFilter && s.courseId !== courseFilter) return false;
      return true;
    });
  }, [state.sections, state.courses, deptId, courseFilter]);
  const slots = useMemo(() => state.timetable.filter((t) => t.sectionId === sectionId), [state.timetable, sectionId]);
  const section = state.sections.find((s) => s.id === sectionId);
  const programme = state.courses.find((c) => c.id === section?.courseId);

  function openNew(day = dayTab, startHint = "09:00") {
    const start = toHHmm(startHint) || "09:00";
    const end = addMinutes(start, 60);
    setEdit({
      id: uid("tt"),
      sectionId,
      day,
      period: periodLabel(start, end),
      startTime: start,
      endTime: end,
      courseId: "",
      staffId: "",
      room: section?.room ?? "",
    });
    setIsNew(true);
    setError(null);
  }

  function openEdit(slot: TimetableSlot) {
    const times = slotTimes(slot);
    setEdit({ ...slot, startTime: times.start, endTime: times.end, period: periodLabel(times.start, times.end) });
    setIsNew(false);
    setError(null);
  }

  const timeRows = useMemo(() => {
    const map = new Map<string, { start: string; end: string; label: string }>();
    for (const p of PERIODS) {
      const start = toHHmm(p) || "09:00";
      const end = addMinutes(start, 60);
      map.set(`${start}|${end}`, { start, end, label: periodLabel(start, end) });
    }
    for (const s of slots) {
      const t = slotTimes(s);
      map.set(`${t.start}|${t.end}`, { start: t.start, end: t.end, label: periodLabel(t.start, t.end) });
    }
    return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [slots]);

  return (
    <Guard module="timetable">
      <PageHeader
        title="Timetable Management"
        note="Filter by section, then add or edit class times. Conflicts for staff, room, and section are blocked before save."
        action={
          canWrite ? (
            <Button className="min-h-11" onClick={() => openNew()} disabled={!sectionId}>
              Add Class
            </Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total classes" value={`${state.timetable.length}`} />
        <StatCard title="Departments" value={`${new Set(state.timetable.map((t) => state.courses.find((c) => c.id === t.courseId)?.departmentId).filter(Boolean)).size}`} />
        <StatCard title="Subjects" value={`${new Set(state.timetable.map((t) => t.courseId)).size}`} />
        <StatCard title="Staff assigned" value={`${new Set(state.timetable.map((t) => t.staffId)).size}`} />
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <DepartmentSelect
          departments={state.departments}
          value={deptId}
          onChange={(id) => {
            setDeptId(id);
            setCourseFilter("");
            setSectionId("");
          }}
        />
        <CourseSelect
          courses={state.courses}
          departmentId={deptId || undefined}
          kind="programme"
          value={courseFilter}
          onChange={(id) => {
            setCourseFilter(id);
            setSectionId("");
          }}
        />
        <SectionSelect sections={filteredSections} courseId={courseFilter || undefined} value={sectionId} onChange={setSectionId} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={view === "week" ? "default" : "outline"} className="min-h-10" onClick={() => setView("week")}>
          Weekly
        </Button>
        <Button size="sm" variant={view === "day" ? "default" : "outline"} className="min-h-10" onClick={() => setView("day")}>
          Daily
        </Button>
        {DAYS.map((d) => (
          <Button key={d} size="sm" variant={d === dayTab ? "secondary" : "outline"} className="min-h-10" onClick={() => { setDayTab(d); setView("day"); }}>
            {d.slice(0, 3)}
          </Button>
        ))}
      </div>
      <div className={`${view === "week" ? "mb-6 hidden overflow-x-auto rounded-2xl bg-card p-3 ring-1 ring-border/80 erp-shadow md:block" : "hidden"}`}>
        <table className="w-full min-w-[860px] text-sm text-primary">
          <thead>
            <tr>
              <th className="p-3 text-left text-muted-foreground">Time</th>
              {DAYS.map((d) => (
                <th key={d} className="p-3 text-left">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="p-3 font-semibold">{row.label}</td>
                {DAYS.map((d) => {
                  const slot = slots.find((s) => {
                    const t = slotTimes(s);
                    return s.day === d && t.start === row.start && t.end === row.end;
                  });
                  const course = slot ? getSubjectName(state, slot.courseId) : "";
                  const staff = slot ? getStaffName(state, slot.staffId) : "";
                  return (
                    <td key={d} className="p-2 align-top">
                      <div
                        className={`w-full rounded-xl p-2.5 text-left shadow-sm ${
                          slot
                            ? ["bg-rose-100 text-rose-950", "bg-amber-100 text-amber-950", "bg-emerald-100 text-emerald-950", "bg-sky-100 text-sky-950", "bg-violet-100 text-violet-950"][
                                Math.abs(slot.courseId.split("").reduce((n, ch) => n + ch.charCodeAt(0), 0)) % 5
                              ]
                            : "border border-dashed border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {slot ? (
                          <>
                            <p className="font-medium">{course}</p>
                            <p className="text-xs">{staff}</p>
                            <p className="text-xs">{slot.room} · {formatClock(slotTimes(slot).start)}–{formatClock(slotTimes(slot).end)}</p>
                            {canWrite ? (
                              <Button size="sm" variant="outline" className="mt-2 min-h-9" onClick={() => openEdit(slot)}>
                                Edit
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <button type="button" disabled={!canWrite} className="text-xs" onClick={() => openNew(d, row.start)}>
                            {canWrite ? "Tap to add" : "Free"}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={view === "day" ? "grid gap-3" : "grid gap-3 md:hidden"}>
        {slots
          .filter((s) => s.day === dayTab)
          .sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start))
          .map((slot) => {
            const times = slotTimes(slot);
            return (
              <article key={slot.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  {formatClock(times.start)} – {formatClock(times.end)}
                </p>
                <p className="font-semibold text-primary">{getSubjectName(state, slot.courseId)}</p>
                <p className="text-sm">{getStaffName(state, slot.staffId)}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.room || "No room"} · {getSectionShortName(state, slot.sectionId)}
                </p>
                {canWrite ? (
                  <Button size="sm" className="mt-3 min-h-11" onClick={() => openEdit(slot)}>
                    Edit
                  </Button>
                ) : null}
              </article>
            );
          })}
        {slots.filter((s) => s.day === dayTab).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No classes on {dayTab}.</p>
        ) : null}
      </div>
      <FormDialog
        open={Boolean(edit)}
        onOpenChange={(o) => !o && setEdit(null)}
        title={isNew ? "Add Timetable Entry" : "Edit Timetable Entry"}
        description="Change the day, times, subject, staff, and room. Overlapping classes for the same staff, room, or section are rejected."
        size="md"
        error={error}
        saving={saving}
        submitLabel={isNew ? "Create Entry" : "Save Changes"}
        extraActions={
          !isNew && edit ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 sm:mr-auto"
              disabled={saving}
              onClick={async () => {
                await remove("timetable", edit.id, `Cleared ${edit.day} ${edit.period}.`);
                toast.success("Timetable entry removed.");
                setEdit(null);
              }}
            >
              Remove
            </Button>
          ) : null
        }
        onSubmit={async () => {
          if (!edit) return;
          const start = toHHmm(edit.startTime || "") || slotTimes(edit).start;
          const end = toHHmm(edit.endTime || "") || slotTimes(edit).end;
          const timeErr = validateSlotTimes(start, end);
          if (timeErr) {
            setError(timeErr);
            toast.error(timeErr);
            return;
          }
          if (!edit.courseId || !edit.staffId) {
            setError("Subject and staff are required.");
            return;
          }
          const payload: TimetableSlot = {
            ...edit,
            startTime: start,
            endTime: end,
            period: periodLabel(start, end),
            sectionId: edit.sectionId || sectionId,
          };
          const conflicts = findTimetableConflicts(payload, state.timetable, state.staff);
          if (conflicts.length) {
            setError(`Schedule conflict\n${conflicts[0].message}`);
            toast.error("Timetable conflict detected.");
            return;
          }
          setSaving(true);
          try {
            const result = await save("timetable", payload, `Updated timetable for ${payload.day}.`);
            if (!result.ok) {
              setError(result.error ?? "Unable to synchronize changes with the cloud.");
              return;
            }
            toast.success("Timetable updated successfully.");
            setEdit(null);
          } finally {
            setSaving(false);
          }
        }}
      >
        {edit ? (
          <SlotFields
            form={edit}
            departmentId={programme?.departmentId}
            onChange={setEdit}
            timeError={error?.includes("End time") ? error : undefined}
          />
        ) : null}
      </FormDialog>
    </Guard>
  );
}

function SlotFields({
  form,
  departmentId,
  onChange,
  timeError,
}: {
  form: TimetableSlot;
  departmentId?: string;
  onChange: (slot: TimetableSlot) => void;
  timeError?: string;
}) {
  const { state } = useApp();
  const subject = state.courses.find((c) => c.id === form.courseId);
  return (
    <FormSection title="Class details">
      <div className="space-y-1">
        <Label>Day</Label>
        <Select value={form.day} onValueChange={pick((v) => onChange({ ...form, day: v }))} items={Object.fromEntries(DAYS.map((d) => [d, d]))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SectionSelect sections={state.sections} value={form.sectionId} onChange={(id) => onChange({ ...form, sectionId: id })} />
      <div className="space-y-1">
        <Label>Start time</Label>
        <Input type="time" value={form.startTime || slotTimes(form).start} onChange={(e) => onChange({ ...form, startTime: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>End time</Label>
        <Input type="time" value={form.endTime || slotTimes(form).end} onChange={(e) => onChange({ ...form, endTime: e.target.value })} />
        <FieldError message={timeError} />
      </div>
      <CourseSelect
        courses={state.courses}
        departmentId={subject?.departmentId ?? departmentId}
        kind="subject"
        label="Subject"
        value={form.courseId}
        onChange={(id) => {
          const c = state.courses.find((x) => x.id === id);
          const teacher = state.staff.find((t) => t.courseIds.includes(id) || t.departmentId === c?.departmentId);
          onChange({ ...form, courseId: id, staffId: teacher?.id ?? form.staffId });
        }}
      />
      <StaffSelect
        staff={state.staff}
        departmentId={subject?.departmentId ?? departmentId}
        value={form.staffId}
        onChange={(id) => onChange({ ...form, staffId: id })}
      />
      <div className="space-y-1 sm:col-span-2">
        <Label>Room</Label>
        <Input value={form.room} onChange={(e) => onChange({ ...form, room: e.target.value })} />
      </div>
    </FormSection>
  );
}
