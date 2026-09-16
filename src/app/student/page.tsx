"use client";

import { PageHeader } from "@/components/page-header";
import { NoticeList, ProfileCard, StudentKpis, TodayClasses, UnlinkedRecord, useLinkedStudent } from "@/components/portal/summaries";

export default function StudentHome() {
  const { user, student, slots } = useLinkedStudent();
  if (!user) return null;
  if (!student) return <UnlinkedRecord kind="student" />;
  return (
    <div>
      <PageHeader title={`Welcome, ${student.name.split(" ")[0]}`} note="Your classes, attendance, fees, and notices for GP Pharmacy College." />
      <ProfileCard student={student} />
      <div className="mt-4">
        <StudentKpis student={student} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TodayClasses slots={slots} href="/student/timetable" />
        <NoticeList href="/student/notices" />
      </div>
    </div>
  );
}
