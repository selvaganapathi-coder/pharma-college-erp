"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { CourseLabel, DepartmentLabel } from "@/components/ref-label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { batchLabel, sameBatch } from "@/lib/catalog";

export default function BatchesPage() {
  const { state } = useApp();
  const router = useRouter();
  const rows = useMemo(() => {
    const map = new Map<string, { id: string; courseId: string; departmentId: string; label: string; year: number; students: number; sections: number }>();
    for (const section of state.sections) {
      const course = state.courses.find((c) => c.id === section.courseId);
      const label = batchLabel(section);
      const key = `${section.courseId}:${label.toLowerCase()}`;
      const current = map.get(key) ?? {
        id: key,
        courseId: section.courseId,
        departmentId: course?.departmentId ?? "",
        label,
        year: section.year,
        students: 0,
        sections: 0,
      };
      current.sections += 1;
      current.students += state.students.filter((s) => !s.deletedAt && s.sectionId === section.id).length;
      map.set(key, current);
    }
    return [...map.values()];
  }, [state.sections, state.courses, state.students]);

  return (
    <Guard module="sections">
      <PageHeader
        title="Batches"
        note="Intake years are stored on sections (for example 2026–2030). This list is derived from those labels — it does not create a second batch collection."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Batches" value={`${rows.length}`} />
        <StatCard title="Students placed" value={`${rows.reduce((s, r) => s + r.students, 0)}`} />
        <StatCard title="Courses represented" value={`${new Set(rows.map((r) => r.courseId)).size}`} />
        <StatCard title="Sections" value={`${state.sections.length}`} />
      </div>
      <DataTable
        rows={rows}
        empty="No batch labels yet. Add a section with an intake such as 2026–2030."
        mobileTitle={(r) => r.label}
        filter={(row, q) => !q || row.label.toLowerCase().includes(q)}
        onOpen={(r) => {
          const section = state.sections.find((s) => s.courseId === r.courseId && sameBatch(batchLabel(s), r.label));
          if (section) router.push(`/app/sections/${section.id}`);
        }}
        columns={[
          { key: "batch", header: "Batch", cell: (r) => r.label },
          { key: "course", header: "Course", cell: (r) => <CourseLabel id={r.courseId} /> },
          { key: "dept", header: "Department", cell: (r) => <DepartmentLabel id={r.departmentId} /> },
          { key: "year", header: "Year of study", cell: (r) => r.year },
          { key: "n", header: "Students", cell: (r) => r.students },
          { key: "sec", header: "Sections", cell: (r) => r.sections },
          { key: "status", header: "Status", cell: () => <Badge variant="success">Active</Badge> },
        ]}
      />
    </Guard>
  );
}
