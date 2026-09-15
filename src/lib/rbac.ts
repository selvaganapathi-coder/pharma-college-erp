export const PERMISSIONS = {
  students: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  staff: { read: ["admin", "staff"], write: ["admin"] },
  departments: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  courses: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  sections: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  timetable: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  attendance: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  exams: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  fees: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  notices: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  messages: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  reports: { read: ["admin", "staff"], write: ["admin"] },
  transport: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  library: { read: ["admin", "staff", "student"], write: ["admin", "staff"] },
  audit: { read: ["admin"], write: ["admin"] },
  settings: { read: ["admin"], write: ["admin"] },
} as const;

export type ModuleKey = keyof typeof PERMISSIONS;

export function can(role: "admin" | "staff" | "student" | "parent", module: ModuleKey, action: "read" | "write") {
  return (PERMISSIONS[module][action] as readonly string[]).includes(role);
}

export function roleLabel(role: "admin" | "staff" | "student" | "parent") {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  if (role === "student") return "Student";
  return "Parent";
}
