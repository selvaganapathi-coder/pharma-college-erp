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
  const attPct = state.attendance.length
    ? Math.round((present / state.attendance.length) * 100)
    : 0;
  const dueFees = state.fees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
  const paidFees = state.fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);

  const mineFees = sid ? state.fees.filter((f) => f.studentId === sid) : [];
  const mineAtt = sid ? state.attendance.filter((a) => a.studentId === sid) : [];
  const minePresent = mineAtt.filter((a) => a.status === "present").length;
  const minePct = mineAtt.length ? Math.round((minePresent / mineAtt.length) * 100) : 0;

  const urgent = state.notices.filter((n) => n.urgent).slice(0, 3);
  const messages = state.messages.slice(0, 3);

  if (user?.role === "student" || user?.role === "parent") {
    return (
      <div>
        <PageHeader
          title={user.role === "parent" ? `Hello ${user.name}` : `Hello ${user.name}`}
          note={
            user.role === "parent"
              ? `You can see updates for ${myStudent?.name ?? "your child"}. Fees, class, and alerts stay in one place.`
              : "Your class, fees, books, and alerts are on this page."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Attendance" value={`${minePct}%`} note="This month" />
          <Stat
            title="Fees due"
            value={`₹${mineFees.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`}
            note="Pay from the Fees page"
          />
          <Stat
            title="Books out"
            value={`${state.checkouts.filter((c) => c.studentId === sid && !c.returnedOn).length}`}
            note="Library checkouts"
          />
          <Stat
            title="Section"
            value={state.sections.find((s) => s.id === myStudent?.sectionId)?.name ?? "—"}
            note={state.courses.find((c) => c.id === myStudent?.courseId)?.name ?? ""}
          />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#8B1528]">Urgent alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgent.length === 0 ? <p className="text-sm text-[#6B4A1F]">No urgent alerts.</p> : null}
              {urgent.map((n) => (
                <div key={n.id} className="rounded-lg border border-[#F0C94A] bg-[#FFF8EA] p-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge className="bg-[#C41E3A]">Urgent</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#6B4A1F]">{n.body}</p>
                </div>
              ))}
              <Link href="/app/alerts" className="text-sm font-medium text-[#C41E3A]">
                See all alerts
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-[#8B1528]">Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-[#F0C94A] p-3">
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-[#6B4A1F]">{m.body}</p>
                </div>
              ))}
              <Link href="/app/messages" className="text-sm font-medium text-[#C41E3A]">
                Open message portal
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="College home"
        note="A quick view of GP Pharmacy College. Open a card to work. Staff and admin see full records. Students and parents see only their own data."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Students" value={`${state.students.length}`} note="Active records" />
        <Stat title="Staff" value={`${state.staff.length}`} note="Teaching and office" />
        <Stat title="Attendance" value={`${attPct}%`} note="All marked days" />
        <Stat title="Fees collected" value={`₹${paidFees.toLocaleString("en-IN")}`} note={`Due ₹${dueFees.toLocaleString("en-IN")}`} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["Students", "Add and search student files", "/app/students"],
          ["Attendance", "Mark present, late, or absent", "/app/attendance"],
          ["Exam marks", "Enter sessional and term marks", "/app/exams"],
          ["Fees", "See dues and take online pay", "/app/fees"],
          ["Alerts", "Send WhatsApp, SMS, email, in-app", "/app/alerts"],
          ["Reports", "Charts for class and fees", "/app/reports"],
          ["Library", "Books and student checkouts", "/app/library"],
          ["Transport", "Bus routes and seats", "/app/transport"],
          ["Audit logs", "Who changed what, and when", "/app/audit"],
        ].map(([title, note, href]) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-[#C41E3A]">
              <CardHeader>
                <CardTitle className="text-base text-[#8B1528]">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#6B4A1F]">{note}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-[#F0C94A] bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[#6B4A1F]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-[#C41E3A]">{value}</p>
        <p className="text-xs text-[#6B4A1F]">{note}</p>
      </CardContent>
    </Card>
  );
}
