import type { AppState, Role, Staff, Student, User } from "./types";

export type DataScope = {
  role: Role;
  uid: string;
  studentId?: string;
  staffId?: string;
  childStudentId?: string;
  studentIds?: string[];
  sectionId?: string;
  sectionIds?: string[];
  departmentId?: string;
  subjectIds?: string[];
};

export function linkedStudentIds(user: Pick<User, "role" | "studentId" | "childStudentId"> & { studentIds?: string[] }) {
  if (user.role === "student" && user.studentId) return [user.studentId];
  if (user.role === "parent") {
    const extra = user.studentIds?.filter(Boolean) ?? [];
    if (extra.length) return [...new Set(extra)];
    return user.childStudentId ? [user.childStudentId] : [];
  }
  return [];
}

export function primaryStudentId(user: User) {
  return linkedStudentIds(user)[0];
}

export function scopeFromProfile(profile: User, extras?: { sectionId?: string; departmentId?: string; subjectIds?: string[] }): DataScope {
  const studentIds = linkedStudentIds(profile);
  return {
    role: profile.role,
    uid: profile.uid ?? profile.id,
    studentId: primaryStudentId(profile),
    staffId: profile.staffId,
    childStudentId: profile.childStudentId,
    studentIds,
    sectionId: extras?.sectionId,
    departmentId: extras?.departmentId,
    subjectIds: extras?.subjectIds,
  };
}

export function staffTeaching(state: Pick<AppState, "timetable" | "staff" | "students" | "exams">, staffId?: string) {
  const me = state.staff.find((t) => t.id === staffId);
  const slots = staffId ? state.timetable.filter((s) => s.staffId === staffId) : [];
  const sectionIds = [...new Set(slots.map((s) => s.sectionId).filter(Boolean))];
  const subjectIds = [...new Set([...(me?.courseIds ?? []), ...slots.map((s) => s.courseId)])];
  const students = state.students.filter((s) => !s.deletedAt && sectionIds.includes(s.sectionId));
  const exams = state.exams.filter((e) => sectionIds.includes(e.sectionId) || subjectIds.includes(e.courseId));
  return { me, slots, sectionIds, subjectIds, students, exams };
}

export function isLinkedStudentRecord(user: User, student: Student | undefined) {
  if (!student) return false;
  return linkedStudentIds(user).includes(student.id);
}

export function staffRecord(state: Pick<AppState, "staff">, user: User): Staff | undefined {
  if (!user.staffId) return undefined;
  return state.staff.find((t) => t.id === user.staffId && !t.deletedAt);
}
