"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const { state, save, remove, allowed, upload } = useApp();
  const canWrite = allowed("departments", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Department | null>(null);

  return (
    <Guard module="departments">
      <PageHeader
        title="Departments"
        note="Pharmacy subject groups. Staff and courses hang from a department. You can add, edit, or delete."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({ id: uid("d"), code: "", name: "", head: "", phone: "" });
                setOpen(true);
              }}
            >
              Add department
            </Button>
          ) : null
        }
      />
      <DataTable
        rows={state.departments}
        empty="No departments yet. Add the first faculty group."
        canWrite={canWrite}
        filter={(row, q) => !q || `${row.name} ${row.code} ${row.head}`.toLowerCase().includes(q)}
        onEdit={(r) => {
          setForm(r);
          setOpen(true);
        }}
        onDelete={(r) => {
          if (state.courses.some((c) => c.departmentId === r.id) || state.staff.some((t) => t.departmentId === r.id)) {
            alert("Move or delete courses and staff in this department first.");
            return;
          }
          void remove("departments", r.id, `Deleted department ${r.name}.`);
        }}
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
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "head", header: "Head", cell: (r) => r.head },
          { key: "phone", header: "Phone", cell: (r) => r.phone ?? "—" },
          {
            key: "n",
            header: "Staff",
            cell: (r) => state.staff.filter((t) => t.departmentId === r.id).length,
          },
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <PhotoUpload
                label="Department photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("departments", form.id, file)}
              />
              <div className="space-y-1">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Head</Label>
                <Input value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button
                disabled={!form.name}
                onClick={async () => {
                  await save("departments", form, `Saved department ${form.name}.`);
                  setOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
