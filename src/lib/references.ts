import type { AppState } from "./types";
import { batchLabel } from "./catalog";

export type RefKind =
  | "department"
  | "course"
  | "subject"
  | "section"
  | "student"
  | "staff"
  | "exam"
  | "route"
  | "vehicle"
  | "book"
  | "user";

const FALLBACK: Record<RefKind, string> = {
  department: "Unknown Department",
  course: "Unknown Course",
  subject: "Unknown Subject",
  section: "Unknown Section",
  student: "Unknown Student",
  staff: "Unknown Staff",
  exam: "Unknown Exam",
  route: "Unknown Route",
  vehicle: "Unknown Vehicle",
  book: "Unknown Book",
  user: "Unknown User",
};

export function looksLikeId(value: string | undefined | null) {
  if (!value) return false;
  return /^(dept|course|section|stu|st|t|user|exam|sub|route|vehicle|fee|book|c|d|s)-/i.test(value) || /^[a-z]+_[a-z0-9]+$/i.test(value);
}

export function getDepartmentName(state: Pick<AppState, "departments">, id?: string | null) {
  if (!id) return FALLBACK.department;
  return state.departments.find((d) => d.id === id)?.name ?? FALLBACK.department;
}

export function getCourseName(state: Pick<AppState, "courses">, id?: string | null) {
  if (!id) return FALLBACK.course;
  const course = state.courses.find((c) => c.id === id);
  if (!course) return FALLBACK.course;
  return course.code ? `${course.code} · ${course.name}` : course.name;
}

export function getSubjectName(state: Pick<AppState, "courses">, id?: string | null) {
  if (!id) return FALLBACK.subject;
  return state.courses.find((c) => c.id === id)?.name ?? FALLBACK.subject;
}

export function getSectionName(state: Pick<AppState, "sections" | "courses">, id?: string | null) {
  if (!id) return FALLBACK.section;
  const section = state.sections.find((s) => s.id === id);
  if (!section) return FALLBACK.section;
  const course = state.courses.find((c) => c.id === section.courseId);
  const courseName = course?.name ?? FALLBACK.course;
  return `${courseName} ${batchLabel(section)} — ${section.name}`;
}

export function getStudentName(state: Pick<AppState, "students">, id?: string | null) {
  if (!id) return FALLBACK.student;
  return state.students.find((s) => s.id === id)?.name ?? FALLBACK.student;
}

export function getStudentLabel(state: Pick<AppState, "students">, id?: string | null) {
  if (!id) return FALLBACK.student;
  const student = state.students.find((s) => s.id === id);
  if (!student) return FALLBACK.student;
  return student.rollNo ? `${student.name} (${student.rollNo})` : student.name;
}

export function getStaffName(state: Pick<AppState, "staff">, id?: string | null) {
  if (!id) return FALLBACK.staff;
  return state.staff.find((t) => t.id === id)?.name ?? FALLBACK.staff;
}

export function getExamName(state: Pick<AppState, "exams">, id?: string | null) {
  if (!id) return FALLBACK.exam;
  return state.exams.find((e) => e.id === id)?.name ?? FALLBACK.exam;
}

export function getRouteName(state: Pick<AppState, "routes">, id?: string | null) {
  if (!id) return FALLBACK.route;
  return state.routes.find((r) => r.id === id)?.name ?? FALLBACK.route;
}

export function getVehicleName(state: Pick<AppState, "routes">, id?: string | null) {
  if (!id) return FALLBACK.vehicle;
  const route = state.routes.find((r) => r.id === id);
  return route?.vehicleNo ?? FALLBACK.vehicle;
}

export function getBookName(state: Pick<AppState, "books">, id?: string | null) {
  if (!id) return FALLBACK.book;
  return state.books.find((b) => b.id === id)?.title ?? FALLBACK.book;
}

export function getUserName(state: Pick<AppState, "users">, id?: string | null) {
  if (!id) return FALLBACK.user;
  return state.users.find((u) => u.id === id)?.name ?? FALLBACK.user;
}

export function resolveRef(state: AppState, kind: RefKind, id?: string | null): { label: string; missing: boolean } {
  const label = (() => {
    switch (kind) {
      case "department":
        return getDepartmentName(state, id);
      case "course":
        return getCourseName(state, id);
      case "subject":
        return getSubjectName(state, id);
      case "section":
        return getSectionName(state, id);
      case "student":
        return getStudentLabel(state, id);
      case "staff":
        return getStaffName(state, id);
      case "exam":
        return getExamName(state, id);
      case "route":
        return getRouteName(state, id);
      case "vehicle":
        return getVehicleName(state, id);
      case "book":
        return getBookName(state, id);
      case "user":
        return getUserName(state, id);
    }
  })();
  const missing = !id || label === FALLBACK[kind];
  return { label, missing };
}

export function studentSearchText(state: AppState, student: AppState["students"][number]) {
  return [
    student.name,
    student.rollNo,
    student.email,
    student.phone,
    student.parentName,
    student.batch,
    getDepartmentName(state, student.departmentId),
    getCourseName(state, student.courseId),
    getSectionName(state, student.sectionId),
  ]
    .join(" ")
    .toLowerCase();
}
