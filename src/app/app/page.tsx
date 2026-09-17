"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BookOpen, Building2, ClipboardCheck, GraduationCap, Plus, Receipt, Users } from "lucide-react";
import { StatCard, SectionCard } from "@/components/stat-card";
import { AlertCard, severityRank } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { getStaffName, getSubjectName } from "@/lib/references";
import { formatClock, slotTimes } from "@/lib/schedule";
import { DAYS } from "@/lib/types";
import { staffTypeOf } from "@/lib/staff";
import type { AlertSeverity } from "@/lib/types";

export default function DashboardPage() {
  const { user, state, allowed } = useApp();
  const router = useRouter();
  const liveStudents = state.students.filter((s) => !s.deletedAt);
  const liveStaff = state.staff.filter((s) => !s.deletedAt);
  const today = new Date().toISOString().slice(0, 10);
  const weekday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayAtt = state.attendance.filter((a) => a.date === today);
  const presentToday = todayAtt.filter((a) => a.status === "present").length;
  const dueFees = state.fees.filter((f) => f.status !== "paid" && !f.deletedAt);
  const overdueBooks = state.checkouts.filter((c) => !c.returnedOn && c.dueOn < today);
  const upcoming = state.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const important = [...state.notices]
    .filter((n) => !n.archived)
    .sort((a, b) => severityRank((a.severity ?? (a.urgent ? "URGENT" : "INFO")) as AlertSeverity) - severityRank((b.severity ?? "INFO") as AlertSeverity))
    .slice(0, 4);
  const activity = state.auditLogs.slice(0, 6);
  const todaySlots = state.timetable
    .filter((t) => t.day === weekday)
    .sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start))
    .slice(0, 6);

  if (!user) return null;

  const empty = liveStudents.length === 0 && liveStaff.length === 0;
  const programmes = state.courses.filter((c) => c.kind === "programme" || c.years >= 2);

  return (
    <div>
      <Welcome name={user.name} note="Here's what's happening at your pharmacy college today." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Students" value={`${liveStudents.length}`} note={`${liveStudents.filter((s) => s.status === "active").length} enrolled`} icon={<GraduationCap className="size-5" />} tone="gold" />
        <StatCard title="Staff" value={`${liveStaff.filter((s) => s.status === "active").length}`} note={`${liveStaff.filter((s) => staffTypeOf(s) === "teaching").length} teaching`} icon={<Users className="size-5" />} tone="red" />
        <StatCard title="Courses" value={`${programmes.length || state.courses.length}`} note="Active programmes" icon={<BookOpen className="size-5" />} />
        <StatCard title="Departments" value={`${state.departments.length}`} note="Academic departments" icon={<Building2 className="size-5" />} tone="maroon" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's attendance" value={todayAtt.length ? `${presentToday}/${todayAtt.length}` : "—"} note={todayAtt.length ? "Marked today" : "Not marked yet"} icon={<ClipboardCheck className="size-5" />} />
        <StatCard title="Pending fees" value={`₹${dueFees.reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`} note={`${dueFees.length} bill(s)`} icon={<Receipt className="size-5" />} tone="red" />
        <StatCard title="Upcoming exams" value={`${upcoming.length}`} note={upcoming[0]?.name ?? "None scheduled"} icon={<BookOpen className="size-5" />} />
        <StatCard title="Library overdue" value={`${overdueBooks.length}`} note="Unreturned past due date" icon={<BookOpen className="size-5" />} tone="maroon" />
      </div>
      {empty ? (
        <div className="mt-6">
          <EmptyState title="Get the college live" description="Add departments, programmes, and staff, then admit students. Metrics stay at zero until real records exist." actionLabel="Add a department" onAction={() => router.push("/app/departments")} />
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_1fr_1fr]">
        <div className="erp-card relative min-h-[260px] overflow-hidden bg-gradient-to-br from-primary via-[#7a1520] to-[#3b0a0a] p-6 text-primary-foreground">
          <p className="text-xs font-semibold tracking-[0.2em] text-secondary uppercase">Campus</p>
          <h2 className="mt-8 max-w-xs text-2xl font-semibold leading-tight sm:mt-20 sm:text-3xl">Shaping Future Pharmacists</h2>
          <p className="mt-2 text-sm text-primary-foreground/80">Knowledge · Research · Innovation · Service</p>
          <Button className="mt-5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => router.push("/app/students")}>
            Our Mission
          </Button>
        </div>
        <ScheduleCard slots={todaySlots} weekday={weekday} />
        <AlertsColumn notices={important} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Quick actions">
          <div className="flex flex-wrap gap-2">
            {allowed("students", "write") ? <Button className="rounded-full" onClick={() => router.push("/app/students")}><Plus className="size-4" /> Add Student</Button> : null}
            {allowed("staff", "write") ? <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/staff")}>Add Staff</Button> : null}
            {allowed("timetable", "write") ? <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/timetable")}>Create Timetable</Button> : null}
            {allowed("attendance", "write") ? <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/attendance")}>Record Attendance</Button> : null}
            {allowed("notices", "write") ? <Button variant="outline" className="rounded-full" onClick={() => router.push("/app/alerts")}>Create Notice</Button> : null}
          </div>
        </SectionCard>
        <SectionCard title="Recent activity" action={<Link href="/app/audit" className="text-xs font-semibold text-primary">View all</Link>}>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity on this device yet.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((log) => (
                <li key={log.id} className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
                  <span className="min-w-0 truncate">{log.details || log.action}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(log.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Welcome({ name, note }: { name: string; note: string }) {
  return (
    <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold text-primary sm:text-[26px] lg:text-[28px]">Welcome back, {name.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <div className="text-sm text-muted-foreground lg:text-right">
        <p>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <p className="italic">Better education for a healthier tomorrow</p>
      </div>
    </div>
  );
}

function ScheduleCard({
  slots,
  weekday,
}: {
  slots: { id: string; period: string; startTime?: string; endTime?: string; courseId: string; staffId: string; room: string; sectionId: string }[];
  weekday: string;
}) {
  const { state } = useApp();
  return (
    <SectionCard title="Today's Schedule" action={<Link href="/app/timetable" className="text-xs font-semibold text-primary">View All</Link>}>
      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No timetable slots for {weekday} yet.</p>
      ) : (
        <ul className="space-y-3">
          {slots.map((slot, i) => {
            const times = slotTimes(slot);
            const dots = ["bg-primary", "bg-amber-500", "bg-emerald-500", "bg-sky-500", "bg-violet-500"];
            return (
              <li key={slot.id} className="flex gap-3">
                <span className={`mt-1 size-2.5 shrink-0 rounded-full ${dots[i % dots.length]}`} />
                <div>
                  <p className="text-sm font-semibold">{getSubjectName(state, slot.courseId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatClock(times.start)} – {formatClock(times.end)} · {getStaffName(state, slot.staffId)} · {slot.room || "Room TBA"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function AlertsColumn({ notices }: { notices: import("@/lib/types").Notice[] }) {
  return (
    <SectionCard title="Important Alerts" action={<Link href="/app/alerts" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View All <Bell className="size-3" /></Link>}>
      {notices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No alerts have been sent.</p>
      ) : (
        <div className="space-y-2">{notices.map((n) => <AlertCard key={n.id} notice={n} compact />)}</div>
      )}
      <p className="mt-4 rounded-2xl bg-secondary/25 px-3 py-3 text-xs text-primary">Education in pharmacy today leads to a healthier society tomorrow.</p>
    </SectionCard>
  );
}
