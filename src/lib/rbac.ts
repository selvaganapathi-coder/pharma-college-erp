export const PERMISSIONS = {
  students: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  staff: { read: ["admin", "staff"], write: ["admin"] },
  departments: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  courses: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  sections: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  timetable: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  attendance: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  exams: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  fees: { read: ["admin", "student", "parent"], write: ["admin"] },
  notices: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  messages: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff"] },
  reports: { read: ["admin"], write: ["admin"] },
  transport: { read: ["admin"], write: ["admin"] },
  library: { read: ["admin", "staff", "student", "parent"], write: ["admin"] },
  audit: { read: ["admin"], write: ["admin"] },
  settings: { read: ["admin"], write: ["admin"] },
  profile: { read: ["admin", "staff", "student", "parent"], write: ["admin", "staff", "student", "parent"] },
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
