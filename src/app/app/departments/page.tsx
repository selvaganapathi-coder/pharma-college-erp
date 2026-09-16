"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { getCourseName } from "@/lib/references";
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
            toast.error("Move or archive courses and staff in this department first.");
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
            key: "courses",
            header: "Courses",
            cell: (r) => {
              const list = state.courses.filter((c) => c.departmentId === r.id && (c.kind === "programme" || c.years >= 2));
              return list.length ? list.map((c) => c.name).join(", ") : "—";
            },
          },
          {
            key: "n",
            header: "Staff",
            cell: (r) => state.staff.filter((t) => t.departmentId === r.id).length,
          },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={form && state.departments.some((d) => d.id === form.id) ? "Edit Department" : "Add Department"}
        description="Pharmacy faculty groups. Courses and staff belong to a department by name, not by raw ID."
        submitLabel="Save Department"
        onSubmit={async () => {
          if (!form?.name.trim()) {
            toast.error("Department name is required.");
            return;
          }
          const result = await save("departments", form, `Saved department ${form.name}.`);
          if (!result.ok) return;
          toast.success("Department saved successfully.");
          setOpen(false);
        }}
      >
        {form ? (
          <FormSection title="Department details">
            <div className="sm:col-span-2">
              <PhotoUpload
                label="Department photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("departments", form.id, file)}
              />
            </div>
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
            <div className="sm:col-span-2 text-sm text-muted-foreground">
              Programmes:{" "}
              {state.courses
                .filter((c) => c.departmentId === form.id && (c.kind === "programme" || c.years >= 2))
                .map((c) => getCourseName({ courses: state.courses }, c.id))
                .join(", ") || "None yet"}
            </div>
          </FormSection>
        ) : null}
      </FormDialog>
    </Guard>
  );
}
