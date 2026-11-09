import { EMPTY_STATE, type AppState, type Role, type User } from "./types";
import { samplePharmacyBooks } from "./sample-catalog";

export const PREVIEW_ROLE_KEY = "gp-preview-role";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const courseId = "preview-course";
const sectionId = "preview-section";
const studentId = "preview-student";
const staffRecordId = "preview-staff-record";

export function isPreviewRole(value: string | null): value is Role {
  return value === "admin" || value === "staff" || value === "student" || value === "parent" || value === "librarian" || value === "faculty";
}

export function readPreviewRole(): Role | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(PREVIEW_ROLE_KEY);
  return isPreviewRole(value) ? value : null;
}

/** Local portal session so a role tab can open its pages without Firebase. */
export function previewBundle(role: Role): { user: User; state: AppState } {
  const users: Record<Role, User> = {
    admin: { id: "preview-admin", email: "preview-admin@college.local", name: "College Admin", role: "admin", phone: "", active: true },
    staff: {
      id: "preview-staff",
      email: "preview-staff@college.local",
      name: "College Staff",
      role: "staff",
      phone: "",
      active: true,
      staffId: staffRecordId,
    },
    student: {
      id: "preview-student-user",
      email: "preview-student@college.local",
      name: "Aarav Kumar",
      role: "student",
      phone: "",
      active: true,
      studentId,
    },
    parent: {
      id: "preview-parent",
      email: "preview-parent@college.local",
      name: "College Parent",
      role: "parent",
      phone: "",
      active: true,
      childStudentId: studentId,
    },
    librarian: {
      id: "preview-librarian",
      email: "preview-librarian@college.local",
      name: "College Librarian",
      role: "librarian",
      phone: "",
      active: true,
    },
    faculty: {
      id: "preview-faculty-user",
      email: "preview-faculty@college.local",
      name: "College Faculty",
      role: "faculty",
      phone: "",
      active: true,
      staffId: staffRecordId,
    },
  };
  const user = users[role];
  return {
    user,
    state: {
      ...EMPTY_STATE,
      users: [user],
      departments: [{ id: "preview-dept", code: "PHARM", name: "Pharmacy", head: "College Staff" }],
      courses: [{ id: courseId, code: "BPHARM", name: "B.Pharm", departmentId: "preview-dept", years: 4, credits: 160, kind: "programme" }],
      sections: [{ id: sectionId, name: "A", code: "A", courseId, year: 1, batch: "2026–2030", room: "101", capacity: 40, status: "active" }],
      students: [
        {
          id: studentId,
          rollNo: "2026-001",
          name: "Aarav Kumar",
          email: "preview-student@college.local",
          phone: "",
          gender: "Male",
          dob: "",
          bloodGroup: "",
          parentName: "College Parent",
          parentPhone: "",
          parentEmail: "preview-parent@college.local",
          departmentId: "preview-dept",
          courseId,
          sectionId,
          year: 1,
          batch: "2026–2030",
          address: "",
          admissionDate: "2026-06-01",
          status: "active",
        },
        {
          id: "preview-student-blocked",
          rollNo: "",
          name: "Meera Nair",
          email: "preview-blocked@college.local",
          phone: "",
          gender: "Female",
          dob: "",
          bloodGroup: "",
          parentName: "",
          parentPhone: "",
          parentEmail: "",
          departmentId: "preview-dept",
          courseId,
          sectionId,
          year: 1,
          batch: "2026–2030",
          address: "",
          admissionDate: "2026-06-01",
          status: "active",
        },
      ],
      checkouts: [
        {
          id: "preview-checkout-late",
          bookId: "sample-book-31",
          studentId,
          issuedOn: daysAgo(16),
          dueOn: daysAgo(2),
        },
      ],
      books: samplePharmacyBooks(),
      staff: [
        {
          id: staffRecordId,
          staffCode: "STF001",
          name: "College Staff",
          email: "preview-staff@college.local",
          phone: "",
          title: "Lecturer",
          qualification: "",
          departmentId: "preview-dept",
          courseIds: [courseId],
          joinedOn: "2026-06-01",
          status: "active",
        },
      ],
    },
  };
}
