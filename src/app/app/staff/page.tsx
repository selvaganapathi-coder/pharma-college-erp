"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { CourseSelect, DepartmentSelect } from "@/components/linked-selects";
import { DepartmentLabel } from "@/components/ref-label";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import { toast } from "sonner";
import { firstError, validateStaff } from "@/lib/validation";
import type { Staff, StaffType, Status } from "@/lib/types";
import { STAFF_TYPES, staffTypeLabel, staffTypeOf } from "@/lib/staff";
import { MobileRecordCard } from "@/components/responsive/mobile-record-card";

function blankStaff(code: string, departmentId: string): Staff {
  return {
    id: uid("t"),
    staffCode: code,
    name: "",
    email: "",
    phone: "",
    altPhone: "",
    title: "Lecturer",
    qualification: "",
    specialization: "",
    licenseNo: "",
    previousInstitution: "",
    experienceYears: 0,
    staffType: "teaching",
    gender: "Female",
    dob: "",
    bloodGroup: "",
    address: "",
    city: "",
    stateName: "",
    pincode: "",
    departmentId,
    courseIds: [],
    joinedOn: new Date().toISOString().slice(0, 10),
    status: "active",
  };
}

export default function StaffPage() {
  const { state, save, remove, allowed, upload, createPortalLogin } = useApp();
  const router = useRouter();
  const canWrite = allowed("staff", "write");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Staff | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [subjectId, setSubjectId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => state.staff.filter((s) => !s.deletedAt), [state.staff]);
  const teaching = rows.filter((t) => staffTypeOf(t) === "teaching").length;
  const nonTeaching = rows.filter((t) => staffTypeOf(t) !== "teaching").length;

  function startNew() {
    setForm(blankStaff(`STF${String(state.staff.length + 1).padStart(3, "0")}`, state.departments[0]?.id ?? ""));
    setIsNew(true);
    setSubjectId("");
    setPortalPassword("");
    setOpen(true);
  }

  return (
    <Guard module="staff">
      <PageHeader
        title="Staff"
        note="Faculty and office records for GP Pharmacy College. Teaching staff can be assigned subject papers from their department."
        action={canWrite ? <Button onClick={startNew}>Add staff</Button> : null}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total staff" value={`${rows.length}`} />
        <StatCard title="Teaching staff" value={`${teaching}`} />
        <StatCard title="Non-teaching staff" value={`${nonTeaching}`} />
        <StatCard title="Active staff" value={`${rows.filter((t) => t.status === "active").length}`} />
      </div>
      <DataTable
        rows={rows}
        empty="No staff yet. Add the first teacher or office record."
        mobileTitle={(r) => r.name}
        mobileCard={(r, actions) => (
          <MobileRecordCard
            photo={
              r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold text-primary">{r.name.slice(0, 1)}</span>
              )
            }
            title={r.name}
            subtitle={r.specialization || r.title}
            meta={`Staff ID: ${r.staffCode}`}
            status={<Badge variant={r.status === "active" ? "success" : "outline"}>{r.status === "active" ? "Active" : "Left"}</Badge>}
            rows={[
              { label: "Role", value: staffTypeLabel(staffTypeOf(r)) },
              { label: "Department", value: <DepartmentLabel id={r.departmentId} /> },
            ]}
            actions={actions}
          />
        )}
        canWrite={canWrite}
        filter={(row, q) =>
          !q ||
          `${row.name} ${row.staffCode} ${row.email} ${row.title} ${row.phone} ${staffTypeLabel(staffTypeOf(row))}`.toLowerCase().includes(q)
        }
        onOpen={(r) => router.push(`/app/staff/${r.id}`)}
        onEdit={(r) => {
          setForm({ ...blankStaff(r.staffCode, r.departmentId), ...r, staffType: staffTypeOf(r) });
          setIsNew(false);
          setSubjectId("");
          setPortalPassword("");
          setOpen(true);
        }}
        onDelete={(r) => void remove("staff", r.id, `Deleted staff ${r.name}.`)}
        columns={[
          {
            key: "photo",
            header: "Photo",
            hideOnMobile: true,
            cell: (r) =>
              r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                "—"
              ),
          },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "code", header: "Employee ID", cell: (r) => r.staffCode },
          { key: "title", header: "Designation", cell: (r) => r.title },
          { key: "dept", header: "Department", cell: (r) => <DepartmentLabel id={r.departmentId} /> },
          { key: "type", header: "Staff type", cell: (r) => staffTypeLabel(staffTypeOf(r)) },
          { key: "phone", header: "Phone", cell: (r) => r.phone },
          { key: "email", header: "Email", cell: (r) => r.email, hideOnMobile: true },
          {
            key: "status",
            header: "Status",
            cell: (r) => <Badge variant={r.status === "active" ? "success" : "outline"}>{r.status === "active" ? "Active" : "Left"}</Badge>,
          },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={isNew ? "Add Staff" : "Edit Staff"}
        description={isNew ? "Create a staff profile with employment and professional details." : "Update this staff profile. Department names are used, not internal IDs."}
        size="lg"
        saving={saving}
        submitLabel={isNew ? "Create Staff" : "Save Changes"}
        onSubmit={async () => {
          if (!form) return;
          const err = firstError(validateStaff(form, state.departments));
          if (err) {
            toast.error(err);
            return;
          }
          setSaving(true);
          try {
            const result = await save("staff", form, `Saved staff ${form.name}.`);
            if (!result.ok) return;
            if (portalPassword && form.email) {
              const note = await createPortalLogin({
                email: form.email,
                password: portalPassword,
                name: form.name,
                role: "staff",
                phone: form.phone,
                staffId: form.id,
              });
              if (note) {
                toast.error(note);
                return;
              }
            }
            toast.success(isNew ? "Staff created successfully." : "Staff updated successfully.");
            setPortalPassword("");
            setOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        {form ? (
          <div className="space-y-4">
            <FormSection title="Personal Information">
              <div className="sm:col-span-2">
                <PhotoUpload
                  label="Profile photo"
                  value={form.photoUrl}
                  onChange={(url) => setForm({ ...form, photoUrl: url })}
                  onFile={(file) => upload("staff", form.id, file)}
                />
              </div>
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Date of birth</Label>
                <Input type="date" value={form.dob ?? ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <Select
                  value={form.gender ?? "Female"}
                  onValueChange={pick((v) => setForm({ ...form, gender: v as Staff["gender"] }))}
                  items={{ Female: "Female", Male: "Male", Other: "Other" }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Blood group</Label>
                <Input value={form.bloodGroup ?? ""} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Alternate phone</Label>
                <Input value={form.altPhone ?? ""} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input value={form.stateName ?? ""} onChange={(e) => setForm({ ...form, stateName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Pincode</Label>
                <Input value={form.pincode ?? ""} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
              </div>
            </FormSection>
            <FormSection title="Employment Information">
              <div className="space-y-1">
                <Label>Employee ID</Label>
                <Input value={form.staffCode} onChange={(e) => setForm({ ...form, staffCode: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Staff type</Label>
                <Select
                  value={staffTypeOf(form)}
                  onValueChange={pick((v) => setForm({ ...form, staffType: v as StaffType }))}
                  items={Object.fromEntries(STAFF_TYPES.map((t) => [t.id, t.label]))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <DepartmentSelect
                departments={state.departments}
                value={form.departmentId}
                onChange={(id) => setForm({ ...form, departmentId: id, courseIds: [] })}
              />
              <div className="space-y-1">
                <Label>Joining date</Label>
                <Input type="date" value={form.joinedOn} onChange={(e) => setForm({ ...form, joinedOn: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Employment status</Label>
                <Select value={form.status} onValueChange={pick((v) => setForm({ ...form, status: v as Status }))} items={{ active: "Active", left: "Left" }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  value={form.experienceYears ?? 0}
                  onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Highest qualification</Label>
                <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
              </div>
            </FormSection>
            <FormSection title="Academic / Professional Information">
              <div className="space-y-1">
                <Label>Specialization</Label>
                <Input value={form.specialization ?? ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Registration / license number</Label>
                <Input value={form.licenseNo ?? ""} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} placeholder="Pharmacy Council, if applicable" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Previous institution</Label>
                <Input value={form.previousInstitution ?? ""} onChange={(e) => setForm({ ...form, previousInstitution: e.target.value })} />
              </div>
              {staffTypeOf(form) === "teaching" ? (
                <div className="sm:col-span-2 space-y-2">
                  <CourseSelect
                    label="Add subject handled"
                    courses={state.courses}
                    departmentId={form.departmentId}
                    kind="subject"
                    requireDepartment
                    value={subjectId}
                    onChange={(id) => {
                      setSubjectId(id);
                      if (id && !form.courseIds.includes(id)) setForm({ ...form, courseIds: [...form.courseIds, id] });
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {form.courseIds.length === 0 ? <p className="text-sm text-muted-foreground">No subjects assigned yet.</p> : null}
                    {form.courseIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary"
                        onClick={() => setForm({ ...form, courseIds: form.courseIds.filter((x) => x !== id) })}
                      >
                        {state.courses.find((c) => c.id === id)?.name ?? "Unknown Subject"} ×
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-1 sm:col-span-2">
                <Label>Portal password (optional)</Label>
                <Input type="password" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Create a login for this staff member" />
              </div>
            </FormSection>
          </div>
        ) : null}
      </FormDialog>
    </Guard>
  );
}

