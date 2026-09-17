"use client";

import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CourseLabel, DepartmentLabel, SubjectLabel } from "@/components/ref-label";
import { useApp } from "@/lib/app-context";
import { formatClock, slotTimes } from "@/lib/schedule";
import { staffTypeLabel, staffTypeOf } from "@/lib/staff";

export default function StaffFilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, allowed } = useApp();
  const t = state.staff.find((s) => s.id === id && !s.deletedAt);
  if (!t) return <p role="alert">Staff not found.</p>;
  const slots = state.timetable.filter((slot) => slot.staffId === t.id);
  const att = state.attendance.filter((a) => a.markedBy === t.id || a.markedBy === t.staffCode);
  const canWrite = allowed("staff", "write");

  return (
    <Guard module="staff">
      <PageHeader
        title="Staff Profile"
        note={`${t.staffCode} · GP Pharmacy College`}
        action={
          <div className="flex gap-2">
            {canWrite ? (
              <Button className="min-h-11 rounded-xl" onClick={() => router.push("/app/staff")}>
                Edit from list
              </Button>
            ) : null}
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => router.push("/app/staff")}>
              Back
            </Button>
          </div>
        }
      />
      <Card className="mb-6 border-0 erp-shadow ring-1 ring-border/80">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="size-24 overflow-hidden rounded-full border-4 border-secondary bg-muted">
            {t.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photoUrl} alt={t.name} className="size-full object-cover" />
            ) : (
              <p className="flex size-full items-center justify-center text-2xl font-semibold text-primary">{t.name.slice(0, 1)}</p>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-primary">{t.name}</h2>
              <Badge variant={t.status === "active" ? "success" : "outline"}>{t.status === "active" ? "Active" : "Left"}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.title} · {staffTypeLabel(staffTypeOf(t))}
            </p>
            <p className="text-xs text-muted-foreground">
              Employee ID: {t.staffCode} · Department: <DepartmentLabel id={t.departmentId} />
            </p>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto w-full min-w-0 justify-start gap-1 overflow-x-auto rounded-full bg-muted p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="attendance">Attendance marked</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="grid gap-3 sm:grid-cols-2">
          <Info title="Department">
            <DepartmentLabel id={t.departmentId} />
          </Info>
          <Info title="Designation" value={t.title} />
          <Info title="Email" value={t.email} />
          <Info title="Phone" value={t.phone} />
        </TabsContent>
        <TabsContent value="personal" className="grid gap-3 sm:grid-cols-2">
          <Info title="Date of birth" value={t.dob || "—"} />
          <Info title="Gender" value={t.gender || "—"} />
          <Info title="Blood group" value={t.bloodGroup || "—"} />
          <Info title="Alternate phone" value={t.altPhone || "—"} />
          <Info title="Address" value={t.address || "—"} />
          <Info title="City / State" value={[t.city, t.stateName].filter(Boolean).join(", ") || "—"} />
          <Info title="Pincode" value={t.pincode || "—"} />
        </TabsContent>
        <TabsContent value="employment" className="grid gap-3 sm:grid-cols-2">
          <Info title="Employee ID" value={t.staffCode} />
          <Info title="Staff type" value={staffTypeLabel(staffTypeOf(t))} />
          <Info title="Joined" value={t.joinedOn} />
          <Info title="Experience" value={`${t.experienceYears ?? 0} year(s)`} />
          <Info title="Status" value={t.status === "active" ? "Active" : "Left"} />
        </TabsContent>
        <TabsContent value="qualifications" className="grid gap-3 sm:grid-cols-2">
          <Info title="Highest qualification" value={t.qualification || "—"} />
          <Info title="Specialization" value={t.specialization || "—"} />
          <Info title="Registration / license" value={t.licenseNo || "—"} />
          <Info title="Previous institution" value={t.previousInstitution || "—"} />
        </TabsContent>
        <TabsContent value="subjects">
          {t.courseIds.length ? (
            <div className="flex flex-wrap gap-2">
              {t.courseIds.map((cid) => (
                <Badge key={cid} variant="outline">
                  <SubjectLabel id={cid} />
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subject papers are assigned to this staff member.</p>
          )}
        </TabsContent>
        <TabsContent value="timetable">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timetable entries assigned.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                const times = slotTimes(slot);
                return (
                  <p key={slot.id} className="text-sm">
                    {slot.day} · {formatClock(times.start)} – {formatClock(times.end)} · <CourseLabel id={slot.courseId} /> · {slot.room || "No room"}
                  </p>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="attendance">
          {att.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance rows marked by this staff member on this device.</p>
          ) : (
            <p className="text-sm">{att.length} attendance mark(s) recorded.</p>
          )}
        </TabsContent>
      </Tabs>
    </Guard>
  );
}

function Info({ title, value, children }: { title: string; value?: string; children?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-foreground">{children ?? value ?? "—"}</CardContent>
    </Card>
  );
}
