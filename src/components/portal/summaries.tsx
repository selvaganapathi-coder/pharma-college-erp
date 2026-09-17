"use client";

import Link from "next/link";
import { ClipboardCheck, GraduationCap, Receipt, BookOpen } from "lucide-react";
import { StatCard, SectionCard } from "@/components/stat-card";
import { AlertCard, severityRank } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApp } from "@/lib/app-context";
import { getCourseName, getSectionName, getStaffName, getSubjectName } from "@/lib/references";
import { formatClock, slotTimes } from "@/lib/schedule";
import { attendanceBySubject, attendancePercent, feeTotals, getMyAttendance, getMyCheckouts, getMyExams, getMyFees, getMyNotices, getMyTimetable } from "@/lib/repositories";
import type { Student, TimetableSlot } from "@/lib/types";
import { DAYS } from "@/lib/types";

export function UnlinkedRecord({ kind }: { kind: "student" | "staff" | "child" }) {
  const title =
    kind === "staff"
      ? "Staff account is not linked to a staff record."
      : kind === "child"
        ? "Parent account is not linked to a student record."
        : "Student account is not linked to a student record.";
  return (
    <EmptyState
      title={title}
      description="Please contact the college office so they can attach the correct record to this login."
    />
  );
}

export function ProfileCard({ student }: { student: Student }) {
  const { state } = useApp();
  return (
    <div className="erp-card flex flex-col items-center gap-4 p-4 text-center sm:flex-row sm:items-center sm:text-left">
      <Avatar className="size-16">
        {student.photoUrl ? <AvatarImage src={student.photoUrl} alt="" /> : null}
        <AvatarFallback>{student.name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-primary">{student.name}</p>
        <p className="text-sm text-muted-foreground">
          {getCourseName(state, student.courseId)} · Year {student.year}
        </p>
        <p className="text-xs text-muted-foreground">Admission No: {student.rollNo}</p>
        <p className="text-xs text-muted-foreground">{getSectionName(state, student.sectionId)}</p>
      </div>
    </div>
  );
}

export function AttendanceSummary({ studentId }: { studentId: string }) {
  const { state } = useApp();
  const rows = getMyAttendance(state, studentId);
  const overall = attendancePercent(rows);
  const bySubject = attendanceBySubject(state, studentId);
  return (
    <SectionCard title="Attendance">
      <p className="text-3xl font-semibold text-primary">{overall == null ? "No data available" : `${overall}%`}</p>
      {bySubject.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No attendance has been marked yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {bySubject.map((s) => (
            <li key={s.courseId} className="flex justify-between gap-3">
              <span className="min-w-0 break-words">{s.name}</span>
              <span className="font-semibold">{s.percent}%</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function FeeSummary({ studentId }: { studentId: string }) {
  const { state } = useApp();
  const fees = getMyFees(state, studentId);
  const totals = feeTotals(fees);
  return (
    <SectionCard title="Fees">
      {fees.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fee bills on file.</p>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            Total <span className="font-semibold">₹{totals.total.toLocaleString("en-IN")}</span>
          </p>
          <p>
            Paid <span className="font-semibold">₹{totals.paid.toLocaleString("en-IN")}</span>
          </p>
          <p>
            Balance <span className="font-semibold text-primary">₹{totals.due.toLocaleString("en-IN")}</span>
          </p>
          {totals.nextDue ? <p className="text-xs text-muted-foreground">Due {totals.nextDue.dueDate}</p> : null}
        </div>
      )}
    </SectionCard>
  );
}

export function ExamSummary({ student }: { student: Student }) {
  const { state } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const rows = getMyExams(state, student);
  const next = rows.find((r) => r.exam.date >= today);
  return (
    <SectionCard title="Exams & marks">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exams published for this section.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {next ? (
            <li>
              Upcoming: <span className="font-semibold">{next.exam.name}</span> · {getSubjectName(state, next.exam.courseId)} · {next.exam.date}
            </li>
          ) : (
            <li>No upcoming exam.</li>
          )}
          {rows
            .filter((r) => r.exam.date < today)
            .slice(-3)
            .map((r) => (
              <li key={r.exam.id} className="flex justify-between gap-2">
                <span>{r.exam.name}</span>
                <span>
                  {r.score == null ? "—" : `${r.score}/${r.max}`} {r.grade ?? ""}
                </span>
              </li>
            ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function TodayClasses({ slots, href }: { slots: TimetableSlot[]; href: string }) {
  const { state } = useApp();
  const weekday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const today = slots.filter((s) => s.day === weekday).sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start));
  return (
    <SectionCard title="Today's classes" action={<Link href={href} className="text-xs font-semibold text-primary">View timetable</Link>}>
      {today.length === 0 ? (
        <p className="text-sm text-muted-foreground">No classes on {weekday}.</p>
      ) : (
        <ul className="space-y-3">
          {today.map((slot) => {
            const t = slotTimes(slot);
            return (
              <li key={slot.id}>
                <p className="text-sm font-semibold">{getSubjectName(state, slot.courseId)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatClock(t.start)} – {formatClock(t.end)} · {getStaffName(state, slot.staffId)} · {slot.room || "Room TBA"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function NoticeList({ href }: { href: string }) {
  const { user, state } = useApp();
  if (!user) return null;
  const notices = getMyNotices(state, user)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 5);
  return (
    <SectionCard title="Important notices" action={<Link href={href} className="text-xs font-semibold text-primary">View all</Link>}>
      {notices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notices for you.</p>
      ) : (
        <div className="space-y-2">{notices.map((n) => <AlertCard key={n.id} notice={n} compact />)}</div>
      )}
    </SectionCard>
  );
}

export function StudentKpis({ student }: { student: Student }) {
  const { state } = useApp();
  const att = getMyAttendance(state, student.id);
  const pct = attendancePercent(att);
  const fees = feeTotals(getMyFees(state, student.id));
  const books = getMyCheckouts(state, student.id).filter((c) => !c.returnedOn).length;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Attendance" value={pct == null ? "—" : `${pct}%`} note="Marked sessions" icon={<ClipboardCheck className="size-5" />} tone="gold" />
      <StatCard title="Pending fees" value={`₹${fees.due.toLocaleString("en-IN")}`} note={fees.nextDue ? `Due ${fees.nextDue.dueDate}` : "No open bills"} icon={<Receipt className="size-5" />} tone="red" />
      <StatCard title="Library" value={`${books}`} note="Books issued" icon={<BookOpen className="size-5" />} />
      <StatCard title="Programme" value={getCourseName(state, student.courseId)} note={getSectionName(state, student.sectionId)} icon={<GraduationCap className="size-5" />} tone="maroon" />
    </div>
  );
}

export function useLinkedStudent() {
  const { user, state } = useApp();
  const id = user?.role === "student" ? user.studentId : user?.childStudentId ?? user?.studentIds?.[0];
  const student = state.students.find((s) => s.id === id && !s.deletedAt);
  const slots = getMyTimetable(state, student?.sectionId);
  return { user, student, slots, state };
}
