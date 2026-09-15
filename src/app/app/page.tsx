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
          title={`Hello ${user.name}`}
          note={
            user.role === "parent"
              ? `You see ${myStudent?.name ?? "your child"}: class, fees, and alerts.`
              : "Your class, fees, books, and alerts are here."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Attendance" value={`${minePct}%`} note="This term" />
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
          <Stat title="Section" value={state.sections.find((s) => s.id === myStudent?.sectionId)?.name ?? "—"} note={state.courses.find((c) => c.id === myStudent?.courseId)?.name ?? ""} />
        </div>
        <div className="mt-6 space-y-3">
          {urgent.map((n) => (
            <div key={n.id} className="rounded-lg border-2 border-[#C41E3A] bg-[#FFF8C2] p-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{n.title}</p>
                <Badge className="bg-[#C41E3A] text-[#FFE566]">Urgent</Badge>
              </div>
              <p className="text-sm">{n.body}</p>
            </div>
          ))}
          <Link href="/app/messages" className="font-semibold underline">
            Open messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="College home" note="GP Pharmacy College ERP. Open a card to add, edit, or view live records." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Students" value={`${state.students.length}`} note="Files" />
        <Stat title="Staff" value={`${state.staff.length}`} note="People" />
        <Stat title="Attendance" value={`${attPct}%`} note="All marked days" />
        <Stat title="Fees collected" value={`₹${paidFees.toLocaleString("en-IN")}`} note={`Due ₹${dueFees.toLocaleString("en-IN")}`} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Students", "Photo, parent, course, section", "/app/students"],
          ["Staff", "Department and subjects they teach", "/app/staff"],
          ["Attendance", "Mark by section and paper", "/app/attendance"],
          ["Timetable", "Tap a cell to set class", "/app/timetable"],
          ["Exam marks", "Enter and lock papers", "/app/exams"],
          ["Fees", "Plans, pay, print receipt", "/app/fees"],
          ["Alerts", "WhatsApp, SMS, email, in-app", "/app/alerts"],
          ["Library", "Cover photo, issue, return", "/app/library"],
          ["Audit logs", "Who changed what", "/app/audit"],
        ].map(([title, note, href]) => (
          <Link key={href} href={href}>
            <Card className="h-full border-2 border-[#C41E3A] hover:bg-[#FFF3A0]">
              <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{note}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-2 border-[#C41E3A] bg-[#FFF8C2]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs">{note}</p>
      </CardContent>
    </Card>
  );
}
