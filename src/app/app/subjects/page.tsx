"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { DepartmentLabel } from "@/components/ref-label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { getStaffName } from "@/lib/references";

export default function SubjectsPage() {
  const { state } = useApp();
  const rows = state.courses.filter((c) => c.kind === "subject" || (c.kind !== "programme" && c.years < 2));
  return (
    <Guard module="courses">
      <PageHeader title="Subjects" note="Subject papers used on the timetable and staff assignments. Names are resolved from the course catalogue." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Subject papers" value={`${rows.length}`} />
        <StatCard title="Departments" value={`${new Set(rows.map((r) => r.departmentId)).size}`} />
        <StatCard title="Assigned staff" value={`${state.staff.filter((t) => t.courseIds.some((id) => rows.some((r) => r.id === id))).length}`} />
        <StatCard title="On timetable" value={`${new Set(state.timetable.map((t) => t.courseId)).size}`} />
      </div>
      <DataTable
        rows={rows}
        empty="No subject papers yet. Add a course with type Subject paper."
        mobileTitle={(r) => r.name}
        filter={(row, q) => !q || `${row.name} ${row.code}`.toLowerCase().includes(q)}
        columns={[
          { key: "name", header: "Subject", cell: (r) => r.name },
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "dept", header: "Department", cell: (r) => <DepartmentLabel id={r.departmentId} /> },
          { key: "credits", header: "Credits", cell: (r) => r.credits },
          { key: "type", header: "Type", cell: () => <Badge variant="outline">Subject paper</Badge> },
          {
            key: "staff",
            header: "Staff assigned",
            cell: (r) =>
              state.staff
                .filter((t) => t.courseIds.includes(r.id))
                .map((t) => getStaffName(state, t.id))
                .join(", ") || "—",
          },
        ]}
      />
    </Guard>
  );
}
