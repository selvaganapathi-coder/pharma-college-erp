import type { AppState } from "./types";
import { getCourseName, getDepartmentName } from "./references";

export type SearchHit = { href: string; title: string; subtitle: string; kind: string };

export function searchErp(state: AppState, q: string): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];
  for (const s of state.students.filter((x) => !x.deletedAt)) {
    const hay = `${s.name} ${s.rollNo} ${s.email} ${s.phone} ${getDepartmentName(state, s.departmentId)} ${getCourseName(state, s.courseId)}`.toLowerCase();
    if (hay.includes(needle)) hits.push({ href: `/app/students/${s.id}`, title: s.name, subtitle: s.rollNo, kind: "Student" });
  }
  for (const t of state.staff.filter((x) => !x.deletedAt)) {
    const hay = `${t.name} ${t.staffCode} ${t.email} ${t.title} ${getDepartmentName(state, t.departmentId)}`.toLowerCase();
    if (hay.includes(needle)) hits.push({ href: `/app/staff/${t.id}`, title: t.name, subtitle: t.staffCode, kind: "Staff" });
  }
  for (const d of state.departments) {
    if (`${d.name} ${d.code}`.toLowerCase().includes(needle)) hits.push({ href: `/app/departments/${d.id}`, title: d.name, subtitle: d.code, kind: "Department" });
  }
  for (const c of state.courses) {
    if (`${c.name} ${c.code}`.toLowerCase().includes(needle)) {
      hits.push({
        href: c.kind === "subject" ? "/app/subjects" : "/app/courses",
        title: c.name,
        subtitle: `${c.code} · ${getDepartmentName(state, c.departmentId)}`,
        kind: c.kind === "subject" ? "Subject" : "Course",
      });
    }
  }
  for (const n of state.notices.filter((x) => !x.archived)) {
    if (`${n.title} ${n.body}`.toLowerCase().includes(needle)) hits.push({ href: "/app/alerts", title: n.title, subtitle: n.severity, kind: "Notice" });
  }
  for (const sec of state.sections) {
    if (`${sec.name} ${sec.batch ?? ""}`.toLowerCase().includes(needle)) {
      hits.push({ href: `/app/sections/${sec.id}`, title: `Section ${sec.name}`, subtitle: getCourseName(state, sec.courseId), kind: "Section" });
    }
  }
  return hits.slice(0, 12);
}
