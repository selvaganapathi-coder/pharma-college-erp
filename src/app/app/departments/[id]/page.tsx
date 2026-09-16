"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { StatCard, SectionCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { CourseLabel } from "@/components/ref-label";
import { useApp } from "@/lib/app-context";
import { batchLabel } from "@/lib/catalog";

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();
  const dept = state.departments.find((d) => d.id === id);
  if (!dept) return <p role="alert">Department not found.</p>;
  const programmes = state.courses.filter((c) => c.departmentId === dept.id && (c.kind === "programme" || c.years >= 2));
  const subjects = state.courses.filter((c) => c.departmentId === dept.id && c.kind === "subject");
  const staff = state.staff.filter((t) => t.departmentId === dept.id && !t.deletedAt);
  const courseIds = state.courses.filter((c) => c.departmentId === dept.id).map((c) => c.id);
  const sections = state.sections.filter((s) => courseIds.includes(s.courseId));
  const students = state.students.filter((s) => s.departmentId === dept.id && !s.deletedAt);

  return (
    <Guard module="departments">
      <PageHeader
        title={dept.name}
        note={`${dept.code} · Head: ${dept.head || "—"}`}
        action={
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => router.push("/app/departments")}>
            Back
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Courses" value={`${programmes.length}`} />
        <StatCard title="Subjects" value={`${subjects.length}`} />
        <StatCard title="Staff" value={`${staff.length}`} />
        <StatCard title="Students" value={`${students.length}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Courses">
          {programmes.length === 0 ? <p className="text-sm text-muted-foreground">No programmes in this department.</p> : programmes.map((c) => (
            <p key={c.id} className="border-b border-border/60 py-2 text-sm last:border-0"><CourseLabel id={c.id} /></p>
          ))}
        </SectionCard>
        <SectionCard title="Subjects">
          {subjects.length === 0 ? <p className="text-sm text-muted-foreground">No subject papers yet.</p> : subjects.map((c) => (
            <p key={c.id} className="border-b border-border/60 py-2 text-sm last:border-0">{c.name}</p>
          ))}
        </SectionCard>
        <SectionCard title="Staff">
          {staff.length === 0 ? <p className="text-sm text-muted-foreground">No staff assigned.</p> : staff.map((t) => (
            <p key={t.id} className="border-b border-border/60 py-2 text-sm last:border-0">{t.name} · {t.title}</p>
          ))}
        </SectionCard>
        <SectionCard title="Sections">
          {sections.length === 0 ? <p className="text-sm text-muted-foreground">No sections yet.</p> : sections.map((s) => (
            <button key={s.id} type="button" className="block w-full border-b border-border/60 py-2 text-left text-sm last:border-0" onClick={() => router.push(`/app/sections/${s.id}`)}>
              Section {s.name} · {batchLabel(s)} · <CourseLabel id={s.courseId} />
            </button>
          ))}
        </SectionCard>
      </div>
      <SectionCard title="Students" className="mt-4">
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students in this department.</p>
        ) : (
          students.slice(0, 40).map((s) => (
            <button key={s.id} type="button" className="flex w-full justify-between border-b border-border/60 py-2 text-left text-sm last:border-0" onClick={() => router.push(`/app/students/${s.id}`)}>
              <span>{s.name}</span>
              <span className="text-muted-foreground">{s.rollNo}</span>
            </button>
          ))
        )}
      </SectionCard>
    </Guard>
  );
}
