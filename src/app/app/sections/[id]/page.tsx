"use client";

import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseLabel, DepartmentLabel, StaffLabel, SubjectLabel } from "@/components/ref-label";
import { useApp } from "@/lib/app-context";
import { batchLabel } from "@/lib/catalog";

export default function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();
  const section = state.sections.find((s) => s.id === id);
  if (!section) return <p role="alert">Section not found.</p>;
  const course = state.courses.find((c) => c.id === section.courseId);
  const students = state.students.filter((s) => s.sectionId === section.id && !s.deletedAt);
  const subjects = [...new Set(state.timetable.filter((t) => t.sectionId === section.id).map((t) => t.courseId))];
  const missingCourse = Boolean(section.courseId) && !course;

  return (
    <Guard module="sections">
      <PageHeader
        title={`Section ${section.name}`}
        note={section.code || "Class group"}
        action={
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => router.push("/app/sections")}>
            Back
          </Button>
        }
      />
      {missingCourse ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          This section references a course that no longer exists.
        </p>
      ) : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info title="Course">
          <CourseLabel id={section.courseId} />
        </Info>
        <Info title="Batch" value={batchLabel(section)} />
        <Info title="Semester" value={section.semester || `Year ${section.year}`} />
        <Info title="Department">
          <DepartmentLabel id={course?.departmentId} />
        </Info>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Info title="Students" value={`${students.length} / ${section.capacity}`} />
        <Info title="Class advisor">
          <StaffLabel id={section.advisorId} />
        </Info>
        <Info title="Room" value={section.room || "—"} />
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Subjects on timetable</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {subjects.length === 0 ? <p className="text-sm text-muted-foreground">No timetable subjects yet.</p> : null}
          {subjects.map((cid) => (
            <Badge key={cid} variant="outline">
              <SubjectLabel id={cid} />
            </Badge>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students are assigned to this section.</p>
          ) : (
            <ul className="divide-y">
              {students.map((st) => (
                <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <button type="button" className="text-left font-medium text-primary underline-offset-2 hover:underline" onClick={() => router.push(`/app/students/${st.id}`)}>
                    {st.name}
                  </button>
                  <span className="text-muted-foreground">{st.rollNo}</span>
                  <span>
                    <CourseLabel id={st.courseId} />
                  </span>
                  <span>{st.batch || batchLabel(section)}</span>
                  <Badge variant={st.status === "active" ? "success" : "outline"}>{st.status === "active" ? "Active" : "Left"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Guard>
  );
}

function Info({ title, value, children }: { title: string; value?: string; children?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children ?? value ?? "—"}</CardContent>
    </Card>
  );
}
