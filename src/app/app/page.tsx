"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, Building2, ClipboardCheck, GraduationCap, Receipt, Users } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { AlertCard, severityRank } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { getCourseName, getSectionName, getStaffName, getSubjectName } from "@/lib/references";
import { DAYS } from "@/lib/types";
import type { AlertSeverity } from "@/lib/types";

export default function DashboardPage() {
  const { user, state, scopedStudentId } = useApp();
  const router = useRouter();
  const sid = scopedStudentId();
  const myStudent = state.students.find((s) => s.id === sid);
  const liveStudents = state.students.filter((s) => !s.deletedAt);
  const liveStaff = state.staff.filter((s) => !s.deletedAt);
  const today = new Date().toISOString().slice(0, 10);
  const weekday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
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
  const mySection = myStudent?.sectionId;
  const todaySlots = state.timetable
    .filter((t) => t.day === weekday && (!mySection || t.sectionId === mySection))
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(0, 5);

  if (!user) return null;

  if (user.role === "student" || user.role === "parent") {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-primary">Welcome back, {user.name.split(" ")[0]}!</h1>
            <p className="text-sm text-muted-foreground">
              {user.role === "parent" ? `Linked student: ${myStudent?.name ?? "not linked yet"}.` : "Your attendance, fees, library, and notices."}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Attendance" value={mineAtt.length ? `${minePct}%` : "—"} note="Marked sessions" icon={<ClipboardCheck className="size-5" />} tone="gold" />
          <StatCard
            title="Fees due"
            value={`₹${mineFees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`}
            note="Pay from Fees"
            icon={<Receipt className="size-5" />}
            tone="red"
          />
          <StatCard title="Books out" value={`${state.checkouts.filter((c) => c.studentId === sid && !c.returnedOn).length}`} note="Library" icon={<BookOpen className="size-5" />} />
          <StatCard title="Section" value={getSectionName(state, myStudent?.sectionId)} note={getCourseName(state, myStudent?.courseId)} icon={<GraduationCap className="size-5" />} tone="maroon" />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ScheduleCard slots={todaySlots} weekday={weekday} />
          <AlertsColumn notices={important} />
        </div>
      </div>
    );
  }

  const empty = liveStudents.length === 0 && liveStaff.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-primary">Welcome back, {user.name.split(" ")[0]}!</h1>
          <p className="text-sm text-muted-foreground">Here is what is happening at GP Pharmacy College today.</p>
        </div>
        <div className="text-sm text-muted-foreground lg:text-right">
          <p>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="italic">Better education for a healthier tomorrow</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Students" value={`${liveStudents.length}`} note={`${liveStudents.filter((s) => s.status === "active").length} enrolled`} icon={<GraduationCap className="size-5" />} tone="gold" />
        <StatCard title="Staff" value={`${liveStaff.filter((s) => s.status === "active").length}`} note={`${liveStaff.length} on file`} icon={<Users className="size-5" />} tone="red" />
        <StatCard title="Courses" value={`${state.courses.filter((c) => c.kind === "programme").length || state.courses.length}`} note="Programmes on file" icon={<BookOpen className="size-5" />} />
        <StatCard title="Departments" value={`${state.departments.length}`} note="Academic departments" icon={<Building2 className="size-5" />} tone="maroon" />
      </div>
      {empty ? (
        <div className="mt-6">
          <EmptyState title="Get the college live" description="Add departments, programmes, staff, then admit students. Metrics stay at zero until real records exist." actionLabel="Add a department" onAction={() => router.push("/app/departments")} />
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Card className="overflow-hidden border-0 erp-shadow ring-1 ring-border/80">
          <div className="relative min-h-[240px] bg-gradient-to-br from-primary via-[#7a1520] to-[#3b0a0a] p-6 text-primary-foreground">
            <p className="text-xs font-semibold tracking-[0.2em] text-secondary uppercase">Campus</p>
            <h2 className="mt-16 max-w-xs text-3xl font-semibold leading-tight">Shaping Future Pharmacists</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Knowledge · Research · Innovation · Service</p>
            <Button className="mt-5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => router.push("/app/students")}>
              Our Mission
            </Button>
          </div>
        </Card>
        <ScheduleCard slots={todaySlots} weekday={weekday} />
        <AlertsColumn notices={important} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-0 erp-shadow ring-1 ring-border/80">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-primary">Upcoming examinations</h2>
              <Link href="/app/exams" className="text-xs font-semibold text-primary">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming papers.</p>
            ) : (
              upcoming.map((e) => (
                <div key={e.id} className="flex justify-between gap-2 border-b border-border/70 py-2 text-sm last:border-0">
                  <span>{e.name}</span>
                  <Badge variant="outline">{e.date}{e.locked ? " · locked" : ""}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-0 erp-shadow ring-1 ring-border/80">
          <CardContent className="pt-5">
            <h2 className="mb-3 font-semibold text-primary">Operations snapshot</h2>
            <p className="text-sm text-muted-foreground">Today&apos;s attendance {todayAtt.length ? `${presentToday}/${todayAtt.length}` : "not marked yet"} · Fees collected ₹{paidFees.toLocaleString("en-IN")} · Pending ₹{dueFees.toLocaleString("en-IN")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/attendance")}>Attendance</Button>
              <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/fees")}>Fees</Button>
              <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/library")}>Library</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScheduleCard({
  slots,
  weekday,
}: {
  slots: { id: string; period: string; courseId: string; staffId: string; room: string; sectionId: string }[];
  weekday: string;
}) {
  const { state } = useApp();
  return (
    <Card className="border-0 erp-shadow ring-1 ring-border/80">
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-primary">Today&apos;s Schedule</h2>
          <Link href="/app/timetable" className="text-xs font-semibold text-primary">View All</Link>
        </div>
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timetable slots for {weekday} yet.</p>
        ) : (
          <ul className="space-y-3">
            {slots.map((slot) => (
              <li key={slot.id} className="flex gap-3">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-semibold">{getSubjectName(state, slot.courseId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {slot.period} · {getStaffName(state, slot.staffId)} · {slot.room || "Room TBA"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsColumn({ notices }: { notices: import("@/lib/types").Notice[] }) {
  return (
    <Card className="border-0 erp-shadow ring-1 ring-border/80">
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-primary">Important Alerts</h2>
          <Link href="/app/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            View All <Bell className="size-3" />
          </Link>
        </div>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts have been sent.</p>
        ) : (
          <div className="space-y-2">{notices.map((n) => <AlertCard key={n.id} notice={n} />)}</div>
        )}
        <p className="mt-4 rounded-2xl bg-secondary/20 px-3 py-3 text-xs text-primary">
          Education in pharmacy today leads to a healthier society tomorrow.
        </p>
      </CardContent>
    </Card>
  );
}
