"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export default function StudentFilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const st = state.students.find((s) => s.id === id);
  if (sid && sid !== id) {
    return <p className="text-[#C41E3A]">You can only open your own student file.</p>;
  }
  if (!st) return <p className="text-[#C41E3A]">Student not found.</p>;
  const course = state.courses.find((c) => c.id === st.courseId);
  const section = state.sections.find((s) => s.id === st.sectionId);
  const dept = state.departments.find((d) => d.id === st.departmentId);
  const att = state.attendance.filter((a) => a.studentId === st.id);
  const pct = att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : 0;
  const dues = state.fees.filter((f) => f.studentId === st.id && f.status !== "paid");

  return (
    <Guard module="students">
      <PageHeader
        title={st.name}
        note={`${st.rollNo} · ${course?.name ?? ""} · ${section?.name ?? ""}`}
        action={
          <Button variant="outline" className="border-[#C41E3A] text-[#C41E3A]" onClick={() => router.push("/app/students")}>
            Back
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="mx-auto size-40 overflow-hidden rounded-xl border-2 border-[#C41E3A] bg-[#FFE566]">
              {st.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.photoUrl} alt={st.name} className="size-full object-cover" />
              ) : (
                <p className="flex size-full items-center justify-center text-sm">No photo</p>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Info title="Department" value={dept?.name} />
          <Info title="Year" value={String(st.year)} />
          <Info title="Phone" value={st.phone} />
          <Info title="Email" value={st.email} />
          <Info title="Parent" value={`${st.parentName} · ${st.parentPhone}`} />
          <Info title="Blood group" value={st.bloodGroup} />
          <Info title="Attendance" value={`${pct}%`} />
          <Info title="Fees due" value={`₹${dues.reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")}`} />
          <Info title="Address" value={st.address} />
          <Info title="Admission" value={st.admissionDate} />
        </div>
      </div>
    </Guard>
  );
}

function Info({ title, value }: { title: string; value?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-[#C41E3A]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-[#9B1B30]">{value || "—"}</CardContent>
    </Card>
  );
}
