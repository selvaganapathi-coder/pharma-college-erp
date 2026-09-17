"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard, SectionCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { AlertCard } from "@/components/alert-card";
import { Input } from "@/components/ui/input";
import { UnlinkedRecord } from "@/components/portal/summaries";
import { useApp } from "@/lib/app-context";
import { staffTeaching } from "@/lib/scope";
import { getSectionShortName, getStudentName, getSubjectName } from "@/lib/references";
import { DaySelector } from "@/components/responsive/day-selector";
import { DAYS, type Attendance } from "@/lib/types";
import { formatClock, slotTimes } from "@/lib/schedule";
import { getMyNotices, upcomingExams } from "@/lib/repositories";
import { uid } from "@/lib/store";
import { staffTypeLabel, staffTypeOf } from "@/lib/staff";

function useMine() {
  const { user, state } = useApp();
  const scope = staffTeaching(state, user?.staffId);
  return { user, state, ...scope };
}

export function StaffDashboard() {
  const { user, me, slots, students, exams, state } = useMine();
  if (!user) return null;
  if (!me) return <UnlinkedRecord kind="staff" />;
  const weekday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const today = slots.filter((s) => s.day === weekday).sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start));
  const todayStr = new Date().toISOString().slice(0, 10);
  const attToday = state.attendance.filter((a) => a.date === todayStr && students.some((s) => s.id === a.studentId));
  const pendingMarks = exams.filter((e) => !e.locked);
  const notices = getMyNotices(state, user).slice(0, 4);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div>
      <PageHeader title={`${hello}, ${me.name}`} note="Your teaching load at GP Pharmacy College." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's classes" value={`${today.length}`} />
        <StatCard title="Attendance marked today" value={attToday.length ? `${attToday.length}` : "—"} />
        <StatCard title="Upcoming exams" value={`${upcomingExams(exams).length}`} />
        <StatCard title="Unlocked mark lists" value={`${pendingMarks.length}`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Today's classes" action={<Link href="/staff/timetable" className="text-xs font-semibold text-primary">Timetable</Link>}>
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes on {weekday}.</p>
          ) : (
            <ul className="space-y-2">
              {today.map((slot) => {
                const t = slotTimes(slot);
                return (
                  <li key={slot.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="font-semibold">{getSubjectName(state, slot.courseId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatClock(t.start)} – {formatClock(t.end)} · {getSectionShortName(state, slot.sectionId)} · {slot.room || "Room TBA"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Quick actions">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/staff/attendance" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Take attendance
            </Link>
            <Link href="/staff/exams" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium">
              Enter marks
            </Link>
            <Link href="/staff/students" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium">
              View students
            </Link>
            <Link href="/staff/timetable" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium">
              Timetable
            </Link>
          </div>
        </SectionCard>
      </div>
      <div className="mt-4">
        <SectionCard title="Important notices">
          {notices.length === 0 ? <p className="text-sm text-muted-foreground">No notices.</p> : notices.map((n) => <AlertCard key={n.id} notice={n} compact />)}
        </SectionCard>
      </div>
    </div>
  );
}

export function StaffClassesPage() {
  const { me, slots, state } = useMine();
  if (!me) return <UnlinkedRecord kind="staff" />;
  if (slots.length === 0) return <EmptyState title="No assigned classes" description="When the office puts you on the timetable, those classes appear here." />;
  return (
    <div>
      <PageHeader title="My classes" note="Classes where you are the assigned staff member." />
      <div className="grid gap-3">
        {slots.map((slot) => {
          const t = slotTimes(slot);
          return (
            <article key={slot.id} className="erp-card p-4">
              <p className="text-xs text-muted-foreground">{slot.day} · {formatClock(t.start)} – {formatClock(t.end)}</p>
              <p className="font-semibold text-primary">{getSubjectName(state, slot.courseId)}</p>
              <p className="text-sm">{getSectionShortName(state, slot.sectionId)} · {slot.room || "Room TBA"}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function StaffTimetablePage() {
  const { me, slots, state } = useMine();
  const [day, setDay] = useState(DAYS[new Date().getDay() === 0 ? 5 : Math.max(0, new Date().getDay() - 1)] ?? "Monday");
  if (!me) return <UnlinkedRecord kind="staff" />;
  const rows = slots.filter((s) => s.day === day).sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start));
  return (
    <div>
      <PageHeader title="My timetable" note="Your assigned periods. The office maintains the master timetable." />
      {slots.length === 0 ? (
        <EmptyState title="No timetable yet" description="Assigned classes will list here by day and start time." />
      ) : (
        <>
          <DaySelector value={day} onChange={setDay} />
          <h2 className="mt-4 text-lg font-semibold text-primary">{day}</h2>
          <div className="mt-3 grid gap-3">
            {rows.length === 0 ? (
              <EmptyState title="No timetable classes" description="There are no classes scheduled for this day." />
            ) : (
              rows.map((slot) => {
                const t = slotTimes(slot);
                return (
                  <article key={slot.id} className="erp-card p-4">
                    <p className="text-xs text-muted-foreground">
                      {formatClock(t.start)} – {formatClock(t.end)}
                    </p>
                    <p className="mt-1 font-semibold text-primary">{getSubjectName(state, slot.courseId)}</p>
                    <p className="text-sm">
                      {getSectionShortName(state, slot.sectionId)} · {slot.room || "Room TBA"}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function StaffStudentsPage() {
  const { me, students, state } = useMine();
  if (!me) return <UnlinkedRecord kind="staff" />;
  return (
    <div>
      <PageHeader title="Students" note="Students in sections you teach. This is not the college-wide register." />
      <DataTable
        rows={students}
        empty="No students in your teaching sections."
        filter={(s, q) => `${s.name} ${s.rollNo}`.toLowerCase().includes(q.toLowerCase())}
        columns={[
          { key: "name", header: "Name", cell: (s) => s.name },
          { key: "roll", header: "Admission no", cell: (s) => s.rollNo },
          { key: "section", header: "Section", cell: (s) => getSectionShortName(state, s.sectionId) },
        ]}
      />
    </div>
  );
}

export function StaffAttendancePage() {
  const { user, me, sectionIds, subjectIds, students, state, slots } = useMine();
  const { save } = useApp();
  const [sectionId, setSectionId] = useState(sectionIds[0] ?? "");
  const [courseId, setCourseId] = useState(subjectIds[0] ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  if (!me) return <UnlinkedRecord kind="staff" />;
  const list = students.filter((s) => s.sectionId === sectionId && s.status === "active");
  const allowedSubjects = [...new Set(slots.filter((s) => s.sectionId === sectionId).map((s) => s.courseId))];
  function statusOf(studentId: string): Attendance["status"] {
    return state.attendance.find((a) => a.studentId === studentId && a.date === date && a.courseId === courseId)?.status ?? "present";
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
      `Marked ${status} for ${getStudentName(state, studentId)} on ${date}.`,
    );
  }
  return (
    <div>
      <PageHeader title="Attendance" note="Mark only for sections and subjects you teach." />
      {sectionIds.length === 0 ? (
        <EmptyState title="No classes to mark" description="Attendance opens after you have timetable assignments." />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Section
              <select className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {sectionIds.map((id) => (
                  <option key={id} value={id}>{getSectionShortName(state, id)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Subject
              <select className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {allowedSubjects.map((id) => (
                  <option key={id} value={id}>{getSubjectName(state, id)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Date
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <ul className="space-y-2">
            {list.map((st) => (
              <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-3">
                <span>
                  {st.name} · {st.rollNo}
                </span>
                <div className="flex gap-2">
                  {(["present", "late", "absent"] as const).map((status) => (
                    <Button key={status} size="sm" variant={statusOf(st.id) === status ? "default" : "outline"} onClick={() => setStatus(st.id, status)}>
                      {status}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function StaffExamsPage() {
  const { me, exams, students, state } = useMine();
  const { save } = useApp();
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const exam = exams.find((e) => e.id === examId) ?? exams[0];
  if (!me) return <UnlinkedRecord kind="staff" />;
  const rows = students.filter((s) => !exam || s.sectionId === exam.sectionId);
  return (
    <div>
      <PageHeader title="Exams & marks" note="Enter marks only for exams in your teaching sections." />
      {exams.length === 0 ? (
        <EmptyState title="No exams in your sections" description="The office creates exam papers. When a paper is assigned to your section, it appears here." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {exams.map((e) => (
              <Button key={e.id} size="sm" variant={e.id === exam?.id ? "default" : "outline"} onClick={() => setExamId(e.id)}>
                {e.name}
              </Button>
            ))}
          </div>
          <ul className="space-y-2">
            {rows.map((st) => {
              const mark = state.marks.find((m) => m.examId === exam.id && m.studentId === st.id);
              return (
                <li key={st.id} className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 break-words text-sm">{st.name}</span>
                  <Input
                    className="w-full min-h-11 sm:w-28"
                    type="number"
                    defaultValue={mark?.marks ?? ""}
                    disabled={exam.locked}
                    onBlur={async (e) => {
                      if (exam.locked) return;
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) return;
                      await save("marks", { id: mark?.id ?? uid("mk"), examId: exam.id, studentId: st.id, marks: n }, `Marks for ${st.name}.`);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function StaffNoticesPage() {
  const { user, state } = useMine();
  const notices = user ? getMyNotices(state, user) : [];
  return (
    <div>
      <PageHeader title="Notices" note="Staff-visible college notices." />
      {notices.length === 0 ? <EmptyState title="No notices" description="Office notices for staff appear here." /> : <div className="space-y-2">{notices.map((n) => <AlertCard key={n.id} notice={n} />)}</div>}
    </div>
  );
}

export function StaffMessagesPage() {
  const { state } = useMine();
  return (
    <div>
      <PageHeader title="Messages" note="College messages." />
      {state.messages.length === 0 ? (
        <EmptyState title="No messages" description="Messages from the office appear here." />
      ) : (
        <ul className="space-y-3">
          {state.messages.map((m) => (
            <li key={m.id} className="erp-card p-4">
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-muted-foreground">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StaffProfilePage() {
  const { me } = useMine();
  if (!me) return <UnlinkedRecord kind="staff" />;
  return (
    <div>
      <PageHeader title="Profile" note="Your staff record. Academic assignments are managed by the office." />
      <SectionCard title={me.name}>
        <p className="text-sm">{me.title} · {me.staffCode}</p>
        <p className="text-sm">{me.email}</p>
        <p className="text-sm">{me.phone}</p>
      </SectionCard>
      <div className="mt-3 grid gap-3">
        <SectionCard title="Professional Information">
          <p className="text-sm">Designation: {me.title}</p>
          <p className="text-sm">Specialization: {me.specialization || "—"}</p>
          <p className="text-sm">Experience: {me.experienceYears ?? 0} years</p>
        </SectionCard>
        <SectionCard title="Employment Information">
          <p className="text-sm">Joined: {me.joinedOn || "—"}</p>
          <p className="text-sm">Staff type: {staffTypeLabel(staffTypeOf(me))}</p>
          <p className="text-sm">Status: {me.status}</p>
        </SectionCard>
        <SectionCard title="Academic Qualifications">
          <p className="text-sm">{me.qualification || "—"}</p>
          <p className="text-sm">License: {me.licenseNo || "—"}</p>
        </SectionCard>
        <SectionCard title="Contact Information">
          <p className="break-all text-sm">{me.email}</p>
          <p className="text-sm">{me.phone}</p>
          <p className="text-sm">{me.altPhone || "—"}</p>
        </SectionCard>
      </div>
    </div>
  );
}

export function StaffSettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" note="Personal portal preferences. College administration stays in the Admin portal." />
      <p className="text-sm text-muted-foreground">Notifications appear at the top-right. College-wide settings, users, fees, and audit are not available on the staff portal.</p>
    </div>
  );
}
