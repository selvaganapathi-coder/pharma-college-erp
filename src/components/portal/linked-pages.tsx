"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/photo-upload";
import { AlertCard } from "@/components/alert-card";
import { Badge } from "@/components/ui/badge";
import { BookLabel } from "@/components/ref-label";
import { SectionCard } from "@/components/stat-card";
import { DAYS } from "@/lib/types";
import { useApp } from "@/lib/app-context";
import { getStaffName, getSubjectName } from "@/lib/references";
import { formatClock, slotTimes } from "@/lib/schedule";
import { attendanceBySubject, attendancePercent, getMyAttendance, getMyCheckouts, getMyExams, getMyFees, getMyNotices } from "@/lib/repositories";
import { AttendanceSummary, ExamSummary, FeeSummary, ProfileCard, UnlinkedRecord, useLinkedStudent } from "@/components/portal/summaries";
import { toast } from "sonner";
import { startFeePayment } from "@/lib/pay-client";

export function LinkedProfilePage({ editable }: { editable: boolean }) {
  const { student } = useLinkedStudent();
  const { save, upload, user } = useApp();
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [address, setAddress] = useState(student?.address ?? "");
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  return (
    <div>
      <PageHeader title={editable ? "My Profile" : "Child profile"} note="Academic fields are managed by the college office." />
      <ProfileCard student={student} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Personal">
          <p className="text-sm">Gender: {student.gender}</p>
          <p className="text-sm">Date of birth: {student.dob || "—"}</p>
          <p className="text-sm">Blood group: {student.bloodGroup || "—"}</p>
          {editable ? (
            <div className="mt-3 space-y-2">
              <Label>Phone</Label>
              <Input value={phone || student.phone} onChange={(e) => setPhone(e.target.value)} />
              <Label>Address</Label>
              <Input value={address || student.address} onChange={(e) => setAddress(e.target.value)} />
              <PhotoUpload
                label="Photo"
                value={student.photoUrl}
                onChange={async (url) => {
                  await save("students", { ...student, photoUrl: url }, "Updated photo.");
                }}
                onFile={(f) => upload("students", student.id, f)}
              />
              <Button
                className="min-h-11"
                onClick={async () => {
                  const result = await save("students", { ...student, phone: phone || student.phone, address: address || student.address }, "Updated contact details.");
                  if (result.ok) toast.success("Profile updated.");
                }}
              >
                Save contact details
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm">Phone: {student.phone}</p>
              <p className="text-sm">Address: {student.address}</p>
            </>
          )}
        </SectionCard>
        <SectionCard title="Academic">
          <p className="text-sm">Admission no: {student.rollNo}</p>
          <p className="text-sm">Year: {student.year}</p>
          <p className="text-sm">Batch: {student.batch || "—"}</p>
          <p className="text-sm">Status: {student.status}</p>
          <p className="mt-3 text-xs text-muted-foreground">Department, course, batch, section, admission number, year, marks, fees, and attendance cannot be changed here.</p>
        </SectionCard>
        <SectionCard title="Parent / contact">
          <p className="text-sm">{student.parentName}</p>
          <p className="text-sm">{student.parentPhone}</p>
          <p className="text-sm">{student.parentEmail}</p>
        </SectionCard>
      </div>
    </div>
  );
}

export function LinkedTimetablePage() {
  const { student, slots, state, user } = useLinkedStudent();
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  return (
    <div>
      <PageHeader title="Timetable" note={`Section ${student.sectionId ? getSubjectName(state, student.courseId) : ""} — only this section.`} />
      <div className="grid gap-3">
        {DAYS.map((day) => {
          const rows = slots.filter((s) => s.day === day).sort((a, b) => slotTimes(a).start.localeCompare(slotTimes(b).start));
          return (
            <section key={day} className="erp-card p-4">
              <h2 className="font-semibold text-primary">{day}</h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No classes.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {rows.map((slot) => {
                    const t = slotTimes(slot);
                    return (
                      <li key={slot.id} className="rounded-xl bg-muted/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {formatClock(t.start)} – {formatClock(t.end)}
                        </p>
                        <p className="font-semibold">{getSubjectName(state, slot.courseId)}</p>
                        <p className="text-sm">{getStaffName(state, slot.staffId)}</p>
                        <p className="text-xs text-muted-foreground">{slot.room || "Room TBA"}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function LinkedAttendancePage() {
  const { student, state, user } = useLinkedStudent();
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  const rows = [...getMyAttendance(state, student.id)].sort((a, b) => b.date.localeCompare(a.date));
  const overall = attendancePercent(rows);
  const bySubject = attendanceBySubject(state, student.id);
  return (
    <div>
      <PageHeader title="Attendance" note="View only. Marks are recorded by teaching staff." />
      <AttendanceSummary studentId={student.id} />
      <div className="mt-4 erp-card p-4">
        <h2 className="font-semibold text-primary">Subject-wise</h2>
        {bySubject.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data available</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {bySubject.map((s) => (
              <li key={s.courseId} className="flex justify-between">
                <span>{s.name}</span>
                <span>
                  {s.percent}% ({s.total} sessions)
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">Overall {overall == null ? "—" : `${overall}%`}</p>
      </div>
      <div className="mt-4">
        <h2 className="mb-2 font-semibold text-primary">Recent</h2>
        {rows.length === 0 ? (
          <EmptyState title="No attendance yet" description="When staff mark a class, sessions appear here." />
        ) : (
          <DataTable
            rows={rows.slice(0, 30)}
            filter={() => true}
            hideSearch
            empty="No attendance sessions."
            columns={[
              { key: "date", header: "Date", cell: (r) => r.date },
              { key: "subject", header: "Subject", cell: (r) => getSubjectName(state, r.courseId) },
              { key: "status", header: "Status", cell: (r) => r.status },
            ]}
          />
        )}
      </div>
    </div>
  );
}

export function LinkedExamsPage() {
  const { student, state, user } = useLinkedStudent();
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  const today = new Date().toISOString().slice(0, 10);
  const rows = getMyExams(state, student);
  return (
    <div>
      <PageHeader title="Exams & marks" note="Results are published by the office. You cannot edit marks." />
      <ExamSummary student={student} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Upcoming">
          {rows.filter((r) => r.exam.date >= today).length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming exams.</p>
          ) : (
            rows
              .filter((r) => r.exam.date >= today)
              .map((r) => (
                <p key={r.exam.id} className="text-sm">
                  {r.exam.date} · {r.exam.name} · {getSubjectName(state, r.exam.courseId)} · max {r.max}
                </p>
              ))
          )}
        </SectionCard>
        <SectionCard title="Past results">
          {rows.filter((r) => r.exam.date < today).length === 0 ? (
            <p className="text-sm text-muted-foreground">No published marks.</p>
          ) : (
            rows
              .filter((r) => r.exam.date < today)
              .map((r) => (
                <p key={r.exam.id} className="flex justify-between text-sm">
                  <span>
                    {r.exam.name} · {getSubjectName(state, r.exam.courseId)}
                  </span>
                  <span>
                    {r.score == null ? "—" : `${r.score}/${r.max}`} {r.grade} {r.result}
                  </span>
                </p>
              ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export function LinkedFeesPage() {
  const { student, user } = useLinkedStudent();
  const { state, authHeader } = useApp();
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  const fees = getMyFees(state, student.id);
  return (
    <div>
      <PageHeader title="Fees" note="Pay from this list when Razorpay is configured. Records cannot be edited here." />
      <FeeSummary studentId={student.id} />
      {fees.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No fee bills" description="When the office posts a fee, it appears here with due date and status." />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable
            rows={fees}
            filter={(f, q) => f.term.toLowerCase().includes(q.toLowerCase())}
            empty="No fee bills."
            columns={[
              { key: "term", header: "Term", cell: (f) => f.term },
              { key: "amount", header: "Amount", cell: (f) => `₹${f.amount.toLocaleString("en-IN")}` },
              { key: "due", header: "Due", cell: (f) => f.dueDate },
              { key: "status", header: "Status", cell: (f) => f.status },
              { key: "pay", header: "Pay", cell: (f) =>
                f.status === "paid" ? (
                  "Paid"
                ) : (
                  <Button size="sm" onClick={() => void startFeePayment(f, authHeader)}>
                    Pay
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export function LinkedLibraryPage() {
  const { student, state, user } = useLinkedStudent();
  if (!student) return <UnlinkedRecord kind={user?.role === "parent" ? "child" : "student"} />;
  const outs = getMyCheckouts(state, student.id);
  return (
    <div>
      <PageHeader title="Library" note="Issued books for this student." />
      {outs.length === 0 ? (
        <EmptyState title="No books issued" description="Library loans appear here after the office issues a book." />
      ) : (
        <DataTable
          rows={outs}
          filter={() => true}
          hideSearch
          empty="No books issued."
          columns={[
            { key: "book", header: "Book", cell: (c) => <BookLabel id={c.bookId} /> },
            { key: "issued", header: "Issued", cell: (c) => c.issuedOn },
            { key: "due", header: "Due", cell: (c) => c.dueOn },
            { key: "status", header: "Status", cell: (c) => (c.returnedOn ? `Returned ${c.returnedOn}` : "Out") },
          ]}
        />
      )}
    </div>
  );
}

export function LinkedNoticesPage() {
  const { user, state } = useApp();
  if (!user) return null;
  const notices = getMyNotices(state, user);
  return (
    <div>
      <PageHeader title="Notices" note="Alerts sent to you or your section." />
      {notices.length === 0 ? (
        <EmptyState title="No notices" description="College notices for your portal appear here." />
      ) : (
        <div className="space-y-2">{notices.map((n) => <AlertCard key={n.id} notice={n} />)}</div>
      )}
    </div>
  );
}

export function LinkedMessagesPage() {
  const { state } = useApp();
  const { student } = useLinkedStudent();
  const rows = state.messages.filter((m) => !m.sectionId || m.sectionId === student?.sectionId);
  return (
    <div>
      <PageHeader title="Messages" note="College messages for your section." />
      {rows.length === 0 ? (
        <EmptyState title="No messages" description="When the office posts a message, it will show here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="erp-card p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{m.title}</p>
                {m.urgent ? <Badge>Urgent</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{m.createdAt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
