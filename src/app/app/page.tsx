"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";

export default function DashboardPage() {
  const { user, state, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const myStudent = state.students.find((s) => s.id === sid);
  const present = state.attendance.filter((a) => a.status === "present").length;
  const attPct = state.attendance.length ? Math.round((present / state.attendance.length) * 100) : 0;
  const dueFees = state.fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
  const paidFees = state.fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const mineFees = sid ? state.fees.filter((f) => f.studentId === sid) : [];
  const mineAtt = sid ? state.attendance.filter((a) => a.studentId === sid) : [];
  const minePct = mineAtt.length
    ? Math.round((mineAtt.filter((a) => a.status === "present").length / mineAtt.length) * 100)
    : 0;
  const urgent = state.notices.filter((n) => n.urgent).slice(0, 3);

  if (user?.role === "student" || user?.role === "parent") {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user.name}`}
          note={
            user.role === "parent"
              ? `Linked student: ${myStudent?.name ?? "not linked yet"}.`
              : "Your attendance, fees, and notices."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Attendance" value={mineAtt.length ? `${minePct}%` : "—"} note="This term" />
          <Stat
            title="Fees due"
            value={`₹${mineFees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`}
            note="Pay from Fees"
          />
          <Stat
            title="Books out"
            value={`${state.checkouts.filter((c) => c.studentId === sid && !c.returnedOn).length}`}
            note="Library"
          />
          <Stat
            title="Section"
            value={state.sections.find((s) => s.id === myStudent?.sectionId)?.name ?? "—"}
            note={state.courses.find((c) => c.id === myStudent?.courseId)?.name ?? "Not assigned"}
          />
        </div>
        <div className="mt-6 space-y-3">
          {urgent.length === 0 ? <p className="text-sm text-muted-foreground">No urgent alerts.</p> : null}
          {urgent.map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-primary">{n.title}</p>
                <Badge>Urgent</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
            </div>
          ))}
          <Link href="/app/messages" className="text-sm font-medium text-primary underline">
            Open notices
          </Link>
        </div>
      </div>
    );
  }

  const empty = state.students.length === 0 && state.staff.length === 0;

  return (
    <div>
      <PageHeader
        title="Operations overview"
        note="Add real college data from the modules below. This portal starts empty."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Students" value={`${state.students.length}`} note="Active files" />
        <Stat title="Staff" value={`${state.staff.length}`} note="Faculty and office" />
        <Stat title="Attendance" value={state.attendance.length ? `${attPct}%` : "—"} note="Marked sessions" />
        <Stat
          title="Fees collected"
          value={`₹${paidFees.toLocaleString("en-IN")}`}
          note={dueFees ? `Due ₹${dueFees.toLocaleString("en-IN")}` : "No dues"}
        />
      </div>
      {empty ? (
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle className="text-primary">Get the college live</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Add departments, then programmes and subject papers.</p>
            <p>2. Add sections and staff (set a portal password if they should sign in).</p>
            <p>3. Admit students with photos, parent details, and a login if needed.</p>
            <p>4. Build the timetable, then mark attendance and fees.</p>
          </CardContent>
        </Card>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Students", "Admission files and photos", "/app/students"],
          ["Staff", "Department and subjects", "/app/staff"],
          ["Attendance", "Mark by section and paper", "/app/attendance"],
          ["Timetable", "Edit class slots", "/app/timetable"],
          ["Examinations", "Papers and grades", "/app/exams"],
          ["Fees", "Plans, collection, receipts", "/app/fees"],
          ["Alerts", "WhatsApp, SMS, email, in-app", "/app/alerts"],
          ["Library", "Catalogue and issue", "/app/library"],
          ["Audit", "Change history", "/app/audit"],
        ].map(([title, note, href]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-secondary hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base text-primary">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{note}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
