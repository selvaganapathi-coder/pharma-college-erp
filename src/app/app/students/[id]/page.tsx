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
        title="Student Profile"
        note={`${st.rollNo} · GP Pharmacy College`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => router.push("/app/students")}>
              Back
            </Button>
          </div>
        }
      />
      <Card className="mb-6 border-0 erp-shadow ring-1 ring-border/80">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="size-24 overflow-hidden rounded-full border-4 border-secondary bg-muted">
            {st.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={st.photoUrl} alt={st.name} className="size-full object-cover" />
            ) : (
              <p className="flex size-full items-center justify-center text-2xl font-semibold text-primary">{st.name.slice(0, 1)}</p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-primary">{st.name}</h2>
              <Badge variant={st.status === "active" ? "success" : "outline"}>{st.status === "active" ? "Active" : "Left"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <CourseLabel id={st.courseId} /> · Section <SectionLabel id={st.sectionId} short />
            </p>
            <p className="text-xs text-muted-foreground">Admission No: {st.rollNo}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="text-lg font-semibold text-primary">{att.length ? `${pct}%` : "—"}</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-primary">{marks.length}</p>
              <p className="text-xs text-muted-foreground">Marks</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-primary">₹{fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">Pending fees</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info title="Department">
          <DepartmentLabel id={st.departmentId} />
        </Info>
        <Info title="Attendance" value={att.length ? `${pct}%` : "No marks yet"} />
        <Info title="Fees due" value={`₹${fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`} />
        <Info title="Library" value={`${books.filter((b) => !b.returnedOn).length} books out`} />
      </div>
      <Tabs defaultValue="personal">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
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
            <SectionLabel id={st.sectionId} short />
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
