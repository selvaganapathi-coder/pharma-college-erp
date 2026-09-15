"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export default function StaffFilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useApp();
  const t = state.staff.find((s) => s.id === id);
  if (!t) return <p>Staff not found.</p>;
  const dept = state.departments.find((d) => d.id === t.departmentId);
  return (
    <Guard module="staff">
      <PageHeader
        title={t.name}
        note={`${t.staffCode} · ${t.title}`}
        action={
          <Button variant="outline" className="border-[#C41E3A] text-[#C41E3A]" onClick={() => router.push("/app/staff")}>
            Back
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <div className="size-40 overflow-hidden rounded-xl border-2 border-[#C41E3A] bg-[#FFF8C2]">
          {t.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.photoUrl} alt={t.name} className="size-full object-cover" />
          ) : (
            <p className="flex size-full items-center justify-center text-sm">No photo</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Department</CardTitle>
            </CardHeader>
            <CardContent>{dept?.name}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Qualification</CardTitle>
            </CardHeader>
            <CardContent>{t.qualification || "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {t.email}
              <br />
              {t.phone}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              {t.courseIds.map((cid) => state.courses.find((c) => c.id === cid)?.name).join(", ") || "—"}
            </CardContent>
          </Card>
        </div>
      </div>
    </Guard>
  );
}
