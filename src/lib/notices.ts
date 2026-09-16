import type { AppState, Notice, User } from "./types";
import { linkedStudentIds } from "./scope";

function audienceOf(notice: Notice) {
  return (notice.audience || "all").toLowerCase();
}

export function noticeVisibleTo(notice: Notice, user: User, state: Pick<AppState, "students">) {
  if (notice.archived) return false;
  if (user.role === "admin") return true;
  const aud = audienceOf(notice);
  if (user.role === "staff") {
    if (aud === "students" || aud === "parents" || aud === "parent") return false;
    return true;
  }
  const ids = linkedStudentIds(user);
  const student = state.students.find((s) => ids.includes(s.id));
  if (notice.studentId && ids.includes(notice.studentId)) return true;
  if (notice.sectionId && student?.sectionId === notice.sectionId) return true;
  if (notice.studentId && !ids.includes(notice.studentId)) return false;
  if (user.role === "student") {
    return aud === "all" || aud === "students" || aud === "student";
  }
  if (user.role === "parent") {
    return aud === "all" || aud === "parents" || aud === "parent";
  }
  return false;
}
