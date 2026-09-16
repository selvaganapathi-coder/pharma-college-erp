import type { AppState, Attendance, Exam, Fee, Notice, TimetableSlot, User } from "./types";
import { getCourseName, getStaffName, getSubjectName } from "./references";
import { linkedStudentIds, staffTeaching } from "./scope";
import { slotTimes } from "./schedule";
import { noticeVisibleTo } from "./notices";

export function getMyStudentProfile(state: AppState, user: User) {
  const id = linkedStudentIds(user)[0];
  return state.students.find((s) => s.id === id && !s.deletedAt);
}

export function getMyAttendance(state: AppState, studentId: string): Attendance[] {
  return state.attendance.filter((a) => a.studentId === studentId);
}

export function attendancePercent(rows: Attendance[]) {
  if (!rows.length) return null;
  return Math.round((rows.filter((a) => a.status === "present").length / rows.length) * 100);
}

export function attendanceBySubject(state: AppState, studentId: string) {
  const rows = getMyAttendance(state, studentId);
  const by = new Map<string, Attendance[]>();
  for (const row of rows) {
    const list = by.get(row.courseId) ?? [];
    list.push(row);
    by.set(row.courseId, list);
  }
  return [...by.entries()].map(([courseId, list]) => ({
    courseId,
    name: getSubjectName(state, courseId),
    percent: attendancePercent(list) ?? 0,
    total: list.length,
  }));
}

export function getMyFees(state: AppState, studentId: string): Fee[] {
  return state.fees.filter((f) => f.studentId === studentId && !f.deletedAt);
}

export function feeTotals(fees: Fee[]) {
  const paid = fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const due = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
  const nextDue = fees.filter((f) => f.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return { paid, due, total: paid + due, nextDue };
}

export function getMyTimetable(state: AppState, sectionId: string | undefined): TimetableSlot[] {
  if (!sectionId) return [];
  return [...state.timetable.filter((t) => t.sectionId === sectionId)].sort((a, b) => {
    const day = a.day.localeCompare(b.day);
    if (day) return day;
    return slotTimes(a).start.localeCompare(slotTimes(b).start);
  });
}

export function getMyExams(state: AppState, student: { id: string; sectionId: string }) {
  const exams = state.exams.filter((e) => e.sectionId === student.sectionId);
  return exams
    .map((exam) => {
      const mark = state.marks.find((m) => m.examId === exam.id && m.studentId === student.id);
      const max = exam.maxMarks || 0;
      const score = mark?.marks;
      const pct = score == null || !max ? null : Math.round((score / max) * 100);
      const grade = pct == null ? null : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "F";
      const result = pct == null ? null : pct >= 40 ? "Pass" : "Fail";
      return { exam, mark, score, max, pct, grade, result };
    })
    .sort((a, b) => a.exam.date.localeCompare(b.exam.date));
}

export function getMyNotices(state: AppState, user: User): Notice[] {
  return state.notices.filter((n) => noticeVisibleTo(n, user, state));
}

export function getMyCheckouts(state: AppState, studentId: string) {
  return state.checkouts.filter((c) => c.studentId === studentId);
}

export function getMyStaffProfile(state: AppState, user: User) {
  return staffTeaching(state, user.staffId).me;
}

export function getMyClasses(state: AppState, user: User) {
  return staffTeaching(state, user.staffId);
}

export function describeSlot(state: AppState, slot: TimetableSlot) {
  return {
    subject: getSubjectName(state, slot.courseId),
    staff: getStaffName(state, slot.staffId),
    programme: getCourseName(state, state.sections.find((s) => s.id === slot.sectionId)?.courseId),
  };
}

export function upcomingExams(exams: Exam[], today = new Date().toISOString().slice(0, 10)) {
  return exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}
