import type { AppState, Course, Section, Student } from "./types";

type FieldErrors = Record<string, string>;

export function programmesForDepartment(courses: Course[], departmentId: string) {
  if (!departmentId) return programmesForCollege(courses);
  const inDept = courses.filter((c) => c.departmentId === departmentId);
  const programmes = inDept.filter((c) => c.kind === "programme" || c.years >= 2);
  return programmes.length ? programmes : inDept;
}

export function programmesForCollege(courses: Course[]) {
  const programmes = courses.filter((c) => c.kind === "programme" || c.years >= 2);
  return programmes.length ? programmes : courses;
}

export function normalizeBatch(label?: string | null) {
  return (label ?? "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function displayBatch(label: string) {
  const trimmed = label.trim();
  if (/^\d{4}-\d{4}$/.test(trimmed.replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s/g, ""))) {
    return trimmed.replace(/[\u2010-\u2015\u2212-]/g, "–").replace(/\s/g, "");
  }
  return trimmed;
}

export function sameBatch(a?: string | null, b?: string | null) {
  const left = normalizeBatch(a);
  const right = normalizeBatch(b);
  return Boolean(left) && left === right;
}

export function batchLabel(section: Pick<Section, "batch" | "year">) {
  const batch = section.batch?.trim();
  return batch ? displayBatch(batch) : `Year ${section.year}`;
}

export function batchesForCourse(sections: Section[], courseId: string) {
  if (!courseId) return [];
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const section of sections.filter((s) => s.courseId === courseId)) {
    const label = batchLabel(section);
    const key = normalizeBatch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ id: label, label });
  }
  return out;
}

export function sectionsForCourseBatch(sections: Section[], courseId: string, batch?: string) {
  if (!courseId) return [];
  return sections.filter((s) => s.courseId === courseId && (!batch || sameBatch(batchLabel(s), batch)));
}

export function courseBelongsToDepartment(course: Course | undefined, departmentId: string) {
  return Boolean(course && course.departmentId === departmentId);
}

export function sectionBelongsToCourse(section: Section | undefined, courseId: string) {
  return Boolean(section && section.courseId === courseId);
}

export type CatalogSlice = Pick<AppState, "departments" | "courses" | "sections">;

export function validateStudentPlacement(student: Partial<Student>, catalog: CatalogSlice): FieldErrors {
  const e: FieldErrors = {};
  const dept = catalog.departments.find((d) => d.id === student.departmentId);
  const course = catalog.courses.find((c) => c.id === student.courseId);
  const section = catalog.sections.find((s) => s.id === student.sectionId);
  if (!student.departmentId) e.departmentId = "Department is required.";
  else if (!dept) e.departmentId = "Selected department does not exist.";
  if (!student.courseId) e.courseId = "Course is required.";
  else if (!course) e.courseId = "Selected course does not exist.";
  else if (student.departmentId && !courseBelongsToDepartment(course, student.departmentId)) {
    e.courseId = "Selected course does not belong to the selected department.";
  }
  if (!student.sectionId) e.sectionId = "Section is required.";
  else if (!section) e.sectionId = "Selected section does not exist.";
  else if (student.courseId && !sectionBelongsToCourse(section, student.courseId)) {
    e.sectionId = "Selected section does not belong to the selected course.";
  }
  if (student.batch && section && !sameBatch(batchLabel(section), student.batch)) {
    e.batch = "Selected batch does not match the selected section.";
  }
  return e;
}

export function nextPlacementAfterDepartment(
  catalog: CatalogSlice,
  departmentId: string,
): Pick<Student, "departmentId" | "courseId" | "sectionId" | "batch" | "year"> {
  const courses = programmesForDepartment(catalog.courses, departmentId);
  if (courses.length !== 1) {
    return { departmentId, courseId: "", sectionId: "", batch: "", year: 1 };
  }
  const next = nextPlacementAfterCourse(catalog, departmentId, courses[0].id);
  return { ...next, departmentId };
}

export function nextPlacementAfterCourse(catalog: CatalogSlice, departmentId: string, courseId: string) {
  const course = catalog.courses.find((c) => c.id === courseId);
  const batches = batchesForCourse(catalog.sections, courseId);
  const batch = batches.length === 1 ? batches[0].id : "";
  const sections = sectionsForCourseBatch(catalog.sections, courseId, batch || undefined);
  const section = sections.length === 1 ? sections[0] : undefined;
  return {
    departmentId: course?.departmentId ?? departmentId,
    courseId,
    batch: section ? batchLabel(section) : batch,
    sectionId: section?.id ?? "",
    year: section?.year ?? 1,
  };
}

export function nextPlacementAfterBatch(catalog: CatalogSlice, courseId: string, batch: string) {
  const sections = sectionsForCourseBatch(catalog.sections, courseId, batch);
  const section = sections.length === 1 ? sections[0] : undefined;
  return {
    batch: displayBatch(batch),
    sectionId: section?.id ?? "",
    year: section?.year ?? 1,
  };
}

export function matchBatchOption(options: { id: string; label: string }[], value?: string | null) {
  if (!value) return "";
  return options.find((o) => sameBatch(o.id, value) || sameBatch(o.label, value))?.id ?? value;
}
