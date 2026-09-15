"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { CourseSelect, DepartmentSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Staff } from "@/lib/types";

export default function StaffPage() {
  const { state, save, remove, allowed, upload } = useApp();
  const router = useRouter();
  const canWrite = allowed("staff", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Staff | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");

  const rows = useMemo(() => state.staff, [state.staff]);

  function startNew() {
    setForm({
      id: uid("t"),
      staffCode: `STF${String(state.staff.length + 1).padStart(3, "0")}`,
      name: "",
      email: "",
      phone: "",
      title: "Lecturer",
      qualification: "",
      departmentId: state.departments[0]?.id ?? "",
      courseIds: [],
      joinedOn: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    setOpen(true);
  }

  return (
    <Guard module="staff">
      <PageHeader
        title="Staff records"
        note="Add teachers and office staff. Pick a department, then the subjects they teach in that department. Upload a staff photo."
        action={
          canWrite ? (
            <Button onClick={startNew}>
              Add staff
            </Button>
          ) : null
        }
      />
      <DataTable
        rows={rows}
        empty="No staff yet. Add the first teacher or office record."
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.staffCode} ${row.email} ${row.title}`.toLowerCase().includes(q)}
        onOpen={(r) => router.push(`/app/staff/${r.id}`)}
        onEdit={(r) => {
          setForm(r);
          setOpen(true);
        }}
        onDelete={(r) => void remove("staff", r.id, `Deleted staff ${r.name}.`)}
        columns={[
          {
            key: "photo",
            header: "Photo",
            cell: (r) =>
              r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                "—"
              ),
          },
          { key: "code", header: "Code", cell: (r) => r.staffCode },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "title", header: "Title", cell: (r) => r.title },
          { key: "dept", header: "Department", cell: (r) => state.departments.find((d) => d.id === r.departmentId)?.name },
          {
            key: "subs",
            header: "Subjects",
            cell: (r) =>
              r.courseIds
                .map((id) => state.courses.find((c) => c.id === id)?.code)
                .filter(Boolean)
                .join(", ") || "—",
          },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form && rows.some((r) => r.id === form.id) ? "Edit staff" : "New staff"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <PhotoUpload
                label="Staff photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("staff", form.id, file)}
              />
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Qualification</Label>
                  <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
                </div>
              </div>
              <DepartmentSelect
                departments={state.departments}
                value={form.departmentId}
                onChange={(id) => setForm({ ...form, departmentId: id, courseIds: [] })}
              />
              <CourseSelect
                courses={state.courses}
                departmentId={form.departmentId}
                kind="subject"
                value={subjectId}
                onChange={(id) => {
                  setSubjectId(id);
                  if (!form.courseIds.includes(id)) setForm({ ...form, courseIds: [...form.courseIds, id] });
                }}
              />
              <div className="space-y-1">
                <Label>Portal password</Label>
                <Input type="password" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Optional login for this staff" />
              </div>
              <p className="text-xs">
                Subjects:{" "}
                {form.courseIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="mr-2 underline"
                    onClick={() => setForm({ ...form, courseIds: form.courseIds.filter((x) => x !== id) })}
                  >
                    {state.courses.find((c) => c.id === id)?.code} ×
                  </button>
                ))}
              </p>
              <Button
                disabled={!form.name}
                onClick={async () => {
                  await save("staff", form, `Saved staff ${form.name}.`);
                  if (portalPassword && form.email) {
                    await save(
                      "users",
                      {
                        id: uid("u"),
                        email: form.email.toLowerCase(),
                        password: portalPassword,
                        name: form.name,
                        role: "staff",
                        phone: form.phone,
                        staffId: form.id,
                        active: true,
                      },
                      `Created staff login for ${form.email}.`,
                    );
                  }
                  setPortalPassword("");
                  setOpen(false);
                }}
              >
                Save staff
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
