"use client";

import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookLabel, CourseLabel, DepartmentLabel, RouteLabel, SectionLabel, SubjectLabel } from "@/components/ref-label";
import { useApp } from "@/lib/app-context";
import { getExamName, getVehicleName } from "@/lib/references";
import { batchLabel } from "@/lib/catalog";

export default function StudentFilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const st = state.students.find((s) => s.id === id);
  if (sid && sid !== id) {
    return <p role="alert">You can only open your own student file.</p>;
  }
  if (!st) return <p role="alert">Student not found.</p>;
  const section = state.sections.find((s) => s.id === st.sectionId);
  const att = state.attendance.filter((a) => a.studentId === st.id);
  const pct = att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 0;
  const fees = state.fees.filter((f) => f.studentId === st.id);
  const marks = state.marks.filter((m) => m.studentId === st.id);
  const books = state.checkouts.filter((c) => c.studentId === st.id);
  const logs = state.auditLogs.filter((l) => l.entityId === st.id).slice(0, 20);
  const routeId = st.busRouteId;

  return (
    <Guard module="students">
      <PageHeader
        title={st.name}
        note={`${st.rollNo} · ${st.status}`}
        action={
          <Button variant="outline" className="min-h-11" onClick={() => router.push("/app/students")}>
            Back
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-[200px_1fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="mx-auto size-40 overflow-hidden rounded-xl border border-border bg-accent">
              {st.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.photoUrl} alt={st.name} className="size-full object-cover" />
              ) : (
                <p className="flex size-full items-center justify-center text-sm">No photo</p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info title="Department">
            <DepartmentLabel id={st.departmentId} />
          </Info>
          <Info title="Status" value={st.status} />
          <Info title="Attendance" value={att.length ? `${pct}%` : "No marks yet"} />
          <Info title="Fees due" value={`₹${fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`} />
        </div>
      </div>
      <Tabs defaultValue="personal">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="parent">Parent</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="grid gap-3 sm:grid-cols-2">
          <Info title="Phone" value={st.phone} />
          <Info title="Email" value={st.email} />
          <Info title="Date of birth" value={st.dob} />
          <Info title="Blood group" value={st.bloodGroup} />
          <Info title="Address" value={st.address} />
          <Info title="Admission" value={st.admissionDate} />
        </TabsContent>
        <TabsContent value="academic" className="grid gap-3 sm:grid-cols-2">
          <Info title="Course">
            <CourseLabel id={st.courseId} />
          </Info>
          <Info title="Batch" value={st.batch || (section ? batchLabel(section) : "—")} />
          <Info title="Section">
            <SectionLabel id={st.sectionId} />
          </Info>
          <Info title="Year" value={String(st.year)} />
          <Info title="Department">
            <DepartmentLabel id={st.departmentId} />
          </Info>
        </TabsContent>
        <TabsContent value="parent" className="grid gap-3 sm:grid-cols-2">
          <Info title="Parent name" value={st.parentName} />
          <Info title="Parent phone" value={st.parentPhone} />
          <Info title="Parent email" value={st.parentEmail} />
        </TabsContent>
        <TabsContent value="attendance">
          {att.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance marked.</p>
          ) : (
            att.slice(0, 30).map((a) => (
              <p key={a.id} className="text-sm">
                {a.date} · {a.status} · <SubjectLabel id={a.courseId} />
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="exams">
          {marks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No marks yet.</p>
          ) : (
            marks.map((m) => {
              const ex = state.exams.find((e) => e.id === m.examId);
              return (
                <p key={m.id} className="text-sm">
                  {getExamName(state, m.examId)} · {m.marks}/{ex?.maxMarks ?? "—"}
                </p>
              );
            })
          )}
        </TabsContent>
        <TabsContent value="fees">
          {fees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fee bills.</p>
          ) : (
            fees.map((f) => (
              <p key={f.id} className="text-sm">
                {f.term} · ₹{f.amount.toLocaleString("en-IN")} · <Badge variant="outline">{f.status}</Badge>
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="library">
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No library issues.</p>
          ) : (
            books.map((c) => (
              <p key={c.id} className="text-sm">
                <BookLabel id={c.bookId} /> · due {c.dueOn} {c.returnedOn ? `· returned ${c.returnedOn}` : ""}
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="transport">
          <Info title="Route">
            <RouteLabel id={routeId} />
          </Info>
          <Info title="Vehicle" value={routeId ? getVehicleName(state, routeId) : "Not assigned"} />
        </TabsContent>
        <TabsContent value="history">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit rows for this file on this device.</p>
          ) : (
            logs.map((l) => (
              <p key={l.id} className="text-sm">
                {l.at} · {l.action} · {l.details}
              </p>
            ))
          )}
        </TabsContent>
      </Tabs>
    </Guard>
  );
}

function Info({ title, value, children }: { title: string; value?: string; children?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-foreground">{children ?? value ?? "—"}</CardContent>
    </Card>
  );
}
