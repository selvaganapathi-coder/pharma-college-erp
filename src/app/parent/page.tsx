"use client";

import { PageHeader } from "@/components/page-header";
import { NoticeList, ProfileCard, StudentKpis, TodayClasses, UnlinkedRecord, useLinkedStudent } from "@/components/portal/summaries";

export default function ParentHome() {
  const { user, student, slots } = useLinkedStudent();
  if (!user) return null;
  if (!student) return <UnlinkedRecord kind="child" />;
  return (
    <div>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} note="Progress for the student linked to this parent login." />
      <p className="mb-3 text-sm text-muted-foreground">Student</p>
      <ProfileCard student={student} />
      <div className="mt-4">
        <StudentKpis student={student} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TodayClasses slots={slots} href="/parent/timetable" />
        <NoticeList href="/parent/notices" />
      </div>
    </div>
  );
}
