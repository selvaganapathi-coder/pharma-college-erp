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
import { DAYS, type TimetableSlot } from "@/lib/types";
import {
  addMinutes,
  DAY_END_MIN,
  DAY_START_MIN,
  findTimetableConflicts,
  formatClock,
  normalizeTimetableSlot,
  periodLabel,
  slotTimes,
  toHHmm,
  toMinutes,
  validateSlotTimes,
} from "@/lib/schedule";
import { getSectionShortName, getStaffName, getSubjectName } from "@/lib/references";
import { DaySelector } from "@/components/responsive/day-selector";
import { FilterSheet } from "@/components/responsive/filter-sheet";

export default function TimetablePage() {
  const { state, save, remove, allowed } = useApp();
  const defaultSection = state.sections[0]?.id;
  const [sectionId, setSectionId] = useState(defaultSection ?? "");
  const [deptId, setDeptId] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dayTab, setDayTab] = useState("Monday");
  const [view, setView] = useState<"week" | "day">("week");
  const canWrite = allowed("timetable", "write");
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
    setEdit(normalizeTimetableSlot(slot));
    setIsNew(false);
    setError(null);
  }

  const axis = useMemo(() => {
    const hours: number[] = [];
    for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) hours.push(m);
    return hours;
  }, []);
  const pxPerMin = 1.15;
  const boardHeight = (DAY_END_MIN - DAY_START_MIN) * pxPerMin;

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
      <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-border/80">
        <FilterSheet
          activeCount={[deptId, courseFilter, sectionId].filter(Boolean).length}
          onReset={() => {
            setDeptId("");
            setCourseFilter("");
            setSectionId("");
          }}
        >
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
        </FilterSheet>
      </div>
      <div className="mb-4 space-y-3">
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <Button size="sm" variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>
            Weekly
          </Button>
          <Button size="sm" variant={view === "day" ? "default" : "outline"} onClick={() => setView("day")}>
            Daily
          </Button>
        </div>
        <DaySelector
          value={dayTab}
          onChange={(d) => {
            setDayTab(d);
            setView("day");
          }}
        />
      </div>
      <div className={`${view === "week" ? "mb-6 hidden overflow-x-auto rounded-2xl bg-card p-3 ring-1 ring-border/80 erp-shadow lg:block" : "hidden"}`}>
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[72px_repeat(6,minmax(0,1fr))]">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-sm font-semibold text-primary">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[72px_repeat(6,minmax(0,1fr))]">
            <div className="relative" style={{ height: boardHeight }}>
              {axis.map((m) => (
                <p key={m} className="absolute text-[11px] text-muted-foreground" style={{ top: (m - DAY_START_MIN) * pxPerMin }}>
                  {formatClock(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`)}
                </p>
              ))}
            </div>
            {DAYS.map((d) => (
              <div key={d} className="relative border-l border-border/70" style={{ height: boardHeight }}>
                {axis.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={!canWrite}
                    className="absolute left-0 right-0 border-t border-dashed border-border/50"
                    style={{ top: (m - DAY_START_MIN) * pxPerMin, height: 60 * pxPerMin }}
                    onClick={() => openNew(d, `${String(Math.floor(m / 60)).padStart(2, "0")}:00`)}
                    aria-label={`Add class ${d} ${formatClock(`${String(Math.floor(m / 60)).padStart(2, "0")}:00`)}`}
                  />
                ))}
                {slots
                  .filter((s) => s.day === d)
                  .map((slot) => {
                    const t = slotTimes(normalizeTimetableSlot(slot));
                    const start = toMinutes(t.start);
                    const end = toMinutes(t.end);
                    const top = (start - DAY_START_MIN) * pxPerMin;
                    const height = Math.max(28, (end - start) * pxPerMin);
                    const palette = ["bg-rose-100 text-rose-950", "bg-amber-100 text-amber-950", "bg-emerald-100 text-emerald-950", "bg-sky-100 text-sky-950", "bg-violet-100 text-violet-950"];
                    const color = palette[Math.abs(slot.courseId.split("").reduce((n, ch) => n + ch.charCodeAt(0), 0)) % 5];
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`absolute right-1 left-1 z-10 overflow-hidden rounded-xl p-2 text-left shadow-sm ${color}`}
                        style={{ top, height }}
                        onClick={() => canWrite && openEdit(slot)}
                      >
                        <p className="text-[11px] font-semibold">{formatClock(t.start)} – {formatClock(t.end)}</p>
                        <p className="truncate text-sm font-medium">{getSubjectName(state, slot.courseId)}</p>
                        <p className="truncate text-xs">{getStaffName(state, slot.staffId)}</p>
                        <p className="truncate text-xs">{slot.room}</p>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={view === "day" ? "grid gap-3" : "grid gap-3 lg:hidden"}>
        <h2 className="text-lg font-semibold text-primary">{dayTab}</h2>
        {slots
          .filter((s) => s.day === dayTab)
          .sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start))
          .map((slot) => {
            const times = slotTimes(slot);
            return (
              <article key={slot.id} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatClock(times.start)} – {formatClock(times.end)}
                </p>
                <p className="mt-1 break-words font-semibold text-primary">{getSubjectName(state, slot.courseId)}</p>
                <p className="break-words text-sm">{getStaffName(state, slot.staffId)}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.room || "No room"} · {getSectionShortName(state, slot.sectionId)}
                </p>
                {canWrite ? (
                  <Button size="sm" className="mt-3 min-h-11 w-full sm:w-auto" onClick={() => openEdit(slot)}>
                    Edit
                  </Button>
                ) : null}
              </article>
            );
          })}
        {slots.filter((s) => s.day === dayTab).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            There are no classes scheduled for this day.
          </p>
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
          const payload = normalizeTimetableSlot({
            ...edit,
            startTime: start,
            endTime: end,
            sectionId: edit.sectionId || sectionId,
          });
          const conflicts = findTimetableConflicts(payload, state.timetable, state.staff);
          if (conflicts.length) {
            setError(`Schedule conflict\n${conflicts[0].message}`);
            toast.error("Timetable conflict detected.");
            return;
          }
          setSaving(true);
          try {
            const result = await save("timetable", payload, `Updated timetable ${payload.id} ${payload.day} ${payload.period}.`);
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
        <Input type="time" value={form.startTime || slotTimes(form).start} onChange={(e) => onChange(normalizeTimetableSlot({ ...form, startTime: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>End time</Label>
        <Input type="time" value={form.endTime || slotTimes(form).end} onChange={(e) => onChange(normalizeTimetableSlot({ ...form, endTime: e.target.value }))} />
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
