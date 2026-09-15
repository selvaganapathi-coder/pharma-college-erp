"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ClipboardCheck, GraduationCap, Receipt, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AlertCard, severityRank } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";
import { getCourseName, getSectionName } from "@/lib/references";
import { roleLabel } from "@/lib/rbac";
import type { AlertSeverity } from "@/lib/types";

export default function DashboardPage() {
  const { user, state, scopedStudentId } = useApp();
  const router = useRouter();
  const sid = scopedStudentId();
  const myStudent = state.students.find((s) => s.id === sid);
  const liveStudents = state.students.filter((s) => !s.deletedAt);
  const liveStaff = state.staff.filter((s) => !s.deletedAt);
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = state.attendance.filter((a) => a.date === today);
  const presentToday = todayAtt.filter((a) => a.status === "present").length;
  const dueFees = state.fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
  const paidFees = state.fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const upcoming = state.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const important = [...state.notices]
    .filter((n) => !n.archived)
    .sort((a, b) => severityRank((a.severity ?? (a.urgent ? "URGENT" : "INFO")) as AlertSeverity) - severityRank((b.severity ?? "INFO") as AlertSeverity))
    .slice(0, 5);
  const mineFees = sid ? state.fees.filter((f) => f.studentId === sid) : [];
  const mineAtt = sid ? state.attendance.filter((a) => a.studentId === sid) : [];
  const minePct = mineAtt.length ? Math.round((mineAtt.filter((a) => a.status === "present").length / mineAtt.length) * 100) : 0;

  if (!user) return null;

  if (user.role === "student" || user.role === "parent") {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${user.name}`}
          note={user.role === "parent" ? `Linked student: ${myStudent?.name ?? "not linked yet"}.` : "Your attendance, fees, and notices."}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Attendance" value={mineAtt.length ? `${minePct}%` : "—"} note="Marked sessions" icon={<ClipboardCheck className="size-4" />} />
          <StatCard
            title="Fees due"
            value={`₹${mineFees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`}
            note="Pay from Fees"
            icon={<Receipt className="size-4" />}
          />
          <StatCard title="Books out" value={`${state.checkouts.filter((c) => c.studentId === sid && !c.returnedOn).length}`} note="Library" />
          <StatCard title="Section" value={getSectionName(state, myStudent?.sectionId)} note={getCourseName(state, myStudent?.courseId)} />
        </div>
        <div className="mt-6 space-y-3">
          {important.length === 0 ? <p className="text-sm text-muted-foreground">No alerts yet.</p> : important.map((n) => <AlertCard key={n.id} notice={n} />)}
        </div>
      </div>
    );
  }

  const empty = liveStudents.length === 0 && liveStaff.length === 0;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        note={`${roleLabel(user.role)} · GP Pharmacy College operations`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total students" value={`${liveStudents.length}`} note={`${liveStudents.filter((s) => s.status === "active").length} active`} icon={<GraduationCap className="size-4" />} />
        <StatCard title="Active staff" value={`${liveStaff.filter((s) => s.status === "active").length}`} note={`${liveStaff.length} on file`} icon={<Users className="size-4" />} />
        <StatCard title="Today's attendance" value={todayAtt.length ? `${presentToday}/${todayAtt.length}` : "—"} note={today} icon={<ClipboardCheck className="size-4" />} />
        <StatCard title="Fees collected" value={`₹${paidFees.toLocaleString("en-IN")}`} note="Verified paid only" icon={<Receipt className="size-4" />} />
        <StatCard title="Pending fees" value={`₹${dueFees.toLocaleString("en-IN")}`} note="Due, late, or partial" />
        <StatCard title="Upcoming exams" value={`${upcoming.length}`} note={upcoming[0] ? upcoming[0].name : "None scheduled"} />
      </div>
      {empty ? (
        <div className="mt-6">
          <EmptyState title="Get the college live" description="Add departments, programmes, staff, then admit students. Metrics stay at zero until real records exist." actionLabel="Add a department" onAction={() => router.push("/app/departments")} />
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-primary">Important alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {important.length === 0 ? <p className="text-sm text-muted-foreground">No alerts have been sent.</p> : important.map((n) => <AlertCard key={n.id} notice={n} />)}
            <Link href="/app/alerts" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline">
              <Bell className="size-4" /> Open alerts
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-primary">Upcoming examinations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcoming.length === 0 ? <p className="text-muted-foreground">No upcoming papers.</p> : upcoming.map((e) => (
              <div key={e.id} className="flex justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span>{e.name}</span>
                <Badge variant="outline">{e.date}{e.locked ? " · locked" : ""}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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
