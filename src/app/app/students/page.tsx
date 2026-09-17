"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { BatchSelect, CourseSelect, DepartmentSelect, SectionSelect } from "@/components/linked-selects";
import { CourseLabel, DepartmentLabel, SectionLabel, BatchLabel } from "@/components/ref-label";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { batchLabel, nextPlacementAfterBatch, nextPlacementAfterCourse, nextPlacementAfterDepartment, sameBatch } from "@/lib/catalog";
import { studentSearchText } from "@/lib/references";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import { firstError, validateStudent } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { FilterSheet } from "@/components/responsive/filter-sheet";
import { MobileRecordCard } from "@/components/responsive/mobile-record-card";
import { toast } from "sonner";
import type { Student } from "@/lib/types";

function blank(): Student {
  return {
    id: uid("st"),
    rollNo: "",
    name: "",
    email: "",
    phone: "",
    gender: "Female",
    dob: "2006-01-01",
    bloodGroup: "O+",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    departmentId: "",
    courseId: "",
    sectionId: "",
    year: 1,
    batch: "",
    address: "",
    admissionDate: new Date().toISOString().slice(0, 10),
    status: "active",
  };
}

export default function StudentsPage() {
  const { state, save, remove, allowed, scopedStudentId, upload, createStudent } = useApp();
  const router = useRouter();
  const sid = scopedStudentId();
  const canWrite = allowed("students", "write") && !sid;
  const catalog = { departments: state.departments, courses: state.courses, sections: state.sections };
  const allRows = useMemo(
    () => (sid ? state.students.filter((s) => s.id === sid && !s.deletedAt) : state.students.filter((s) => !s.deletedAt)),
    [state.students, sid],
  );
  const [deptFilter, setDeptFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const rows = useMemo(
    () =>
      allRows.filter((s) => {
        if (deptFilter && s.departmentId !== deptFilter) return false;
        if (courseFilter && s.courseId !== courseFilter) return false;
        if (batchFilter && !sameBatch(s.batch || batchLabel(state.sections.find((sec) => sec.id === s.sectionId) ?? { batch: "", year: s.year }), batchFilter)) return false;
        if (sectionFilter && s.sectionId !== sectionFilter) return false;
        return true;
      }),
    [allRows, batchFilter, courseFilter, deptFilter, sectionFilter, state.sections],
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Student>(blank());
  const [isNew, setIsNew] = useState(true);
  const [createLogin, setCreateLogin] = useState(false);
  const [createParentLogin, setCreateParentLogin] = useState(false);
  const [portalPassword, setPortalPassword] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm(blank());
    setIsNew(true);
    setCreateLogin(false);
    setCreateParentLogin(false);
    setPortalPassword("");
    setParentPassword("");
    setOpen(true);
  }

  const deptOptions = [{ id: "", label: "All departments" }, ...state.departments.map((d) => ({ id: d.id, label: d.name }))];
  const courseOptions = [
    { id: "", label: "All courses" },
    ...state.courses
      .filter((c) => !deptFilter || c.departmentId === deptFilter)
      .filter((c) => c.kind === "programme" || !state.courses.some((x) => x.kind === "programme" && x.departmentId === c.departmentId))
      .map((c) => ({ id: c.id, label: c.code ? `${c.code} · ${c.name}` : c.name })),
  ];
  const batchOptions = [
    { id: "", label: "All batches" },
    ...Array.from(
      new Set(
        state.sections
          .filter((s) => !courseFilter || s.courseId === courseFilter)
          .map((s) => batchLabel(s)),
      ),
    ).map((label) => ({ id: label, label })),
  ];
  const sectionOptions = [
    { id: "", label: "All sections" },
    ...state.sections
      .filter((s) => !courseFilter || s.courseId === courseFilter)
      .filter((s) => !batchFilter || sameBatch(batchLabel(s), batchFilter))
      .map((s) => ({ id: s.id, label: s.name })),
  ];

  return (
    <Guard module="students">
      <PageHeader
        title="Students"
        note="Manage student records, admissions and academic information."
        action={
          canWrite ? (
            <Button className="min-h-11 rounded-xl px-5" onClick={openNew}>+ Add Student</Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total students" value={`${rows.length}`} />
        <StatCard title="Active" value={`${rows.filter((s) => s.status === "active").length}`} />
        <StatCard title="New this month" value={`${rows.filter((s) => s.admissionDate.slice(0, 7) === new Date().toISOString().slice(0, 7)).length}`} />
        <StatCard title="Left / inactive" value={`${rows.filter((s) => s.status === "left").length}`} />
      </div>
      {sid ? null : (
        <div className="mb-4 rounded-2xl bg-card p-4 ring-1 ring-border/80 erp-shadow">
          <FilterSheet
            activeCount={[deptFilter, courseFilter, batchFilter, sectionFilter].filter(Boolean).length}
            onReset={() => {
              setDeptFilter("");
              setCourseFilter("");
              setBatchFilter("");
              setSectionFilter("");
            }}
          >
            <FilterSelect label="Department" value={deptFilter} options={deptOptions} onChange={(id) => { setDeptFilter(id); setCourseFilter(""); setBatchFilter(""); setSectionFilter(""); }} />
            <FilterSelect label="Course" value={courseFilter} options={courseOptions} onChange={(id) => { setCourseFilter(id); setBatchFilter(""); setSectionFilter(""); }} />
            <FilterSelect label="Batch" value={batchFilter} options={batchOptions} onChange={(id) => { setBatchFilter(id); setSectionFilter(""); }} />
            <FilterSelect label="Section" value={sectionFilter} options={sectionOptions} onChange={setSectionFilter} />
          </FilterSheet>
        </div>
      )}
      <DataTable
        rows={rows}
        empty="There are no students matching the selected filters."
        searchPlaceholder="Search students…"
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
            subtitle={
              <>
                <CourseLabel id={r.courseId} /> · Year {r.year}
              </>
            }
            meta={r.rollNo}
            status={<Badge variant={r.status === "active" ? "success" : "outline"}>{r.status === "active" ? "Active" : "Left"}</Badge>}
            rows={[
              { label: "Department", value: <DepartmentLabel id={r.departmentId} /> },
              { label: "Section", value: <SectionLabel id={r.sectionId} short /> },
            ]}
            actions={actions}
          />
        )}
        canWrite={canWrite}
        filter={(row, q) => !q || studentSearchText(state, row).includes(q)}
        onOpen={(r) => router.push(`/app/students/${r.id}`)}
        onEdit={(r) => {
          const section = state.sections.find((s) => s.id === r.sectionId);
          setForm({ ...r, batch: r.batch || (section ? batchLabel(section) : "") });
          setIsNew(false);
          setCreateLogin(false);
          setCreateParentLogin(false);
          setPortalPassword("");
          setParentPassword("");
          setOpen(true);
        }}
        onDelete={(r) => void remove("students", r.id, `Archived student ${r.name}.`)}
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
          { key: "roll", header: "Admission no.", cell: (r) => r.rollNo },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "dept", header: "Department", cell: (r) => <DepartmentLabel id={r.departmentId} /> },
          { key: "course", header: "Course", cell: (r) => <CourseLabel id={r.courseId} /> },
          { key: "batch", header: "Batch", cell: (r) => <BatchLabel label={r.batch} sectionId={r.sectionId} /> },
          { key: "sec", header: "Section", cell: (r) => <SectionLabel id={r.sectionId} short /> },
          { key: "parent", header: "Parent", cell: (r) => r.parentName || r.parentPhone },
          { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "active" ? "success" : "outline"}>{r.status === "active" ? "Active" : "Left"}</Badge> },
        ]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={isNew ? "Add New Student" : "Edit Student"}
        description={isNew ? "Create a student profile and optional portal accounts." : "Update the student profile. Academic selectors keep department, course, batch, and section in sync."}
        size="lg"
        saving={saving}
        submitLabel={isNew ? "Create Student" : "Save Changes"}
        onSubmit={async () => {
          const section = state.sections.find((s) => s.id === form.sectionId);
          const payload = { ...form, batch: section ? batchLabel(section) : form.batch };
          const errors = validateStudent(payload, catalog);
          const err = firstError(errors);
          if (err) {
            toast.error(err);
            return;
          }
          setSaving(true);
          try {
            if (isNew || createLogin || createParentLogin) {
              const note = await createStudent({
                student: payload,
                createLogin,
                password: portalPassword,
                createParentLogin,
                parentPassword,
              });
              if (note) {
                toast.error(note);
                return;
              }
            } else {
              const result = await save("students", payload, `Saved student ${payload.name} (${payload.rollNo}).`);
              if (!result.ok) return;
            }
            toast.success(isNew ? "Student created successfully." : "Student updated successfully.");
            setPortalPassword("");
            setParentPassword("");
            setOpen(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="space-y-4">
          <FormSection title="Personal Information">
            <div className="sm:col-span-2">
              <PhotoUpload
                label="Student photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("students", form.id, file)}
              />
            </div>
            <div className="space-y-1">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Date of birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Admission number</Label>
              <Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={pick((v) => setForm({ ...form, gender: v as Student["gender"] }))} items={{ Female: "Female", Male: "Male" }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Blood group</Label>
              <Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </FormSection>
          <FormSection title="Academic Information" description="Department filters course, course filters batch, batch filters section.">
            <DepartmentSelect
              departments={state.departments}
              value={form.departmentId}
              onChange={(id) => setForm({ ...form, ...nextPlacementAfterDepartment(catalog, id) })}
            />
            <CourseSelect
              courses={state.courses}
              departmentId={form.departmentId}
              kind="programme"
              requireDepartment
              value={form.courseId}
              onChange={(id) => setForm({ ...form, ...nextPlacementAfterCourse(catalog, form.departmentId, id) })}
            />
            <BatchSelect
              sections={state.sections}
              courseId={form.courseId}
              value={form.batch ?? ""}
              onChange={(id) => setForm({ ...form, ...nextPlacementAfterBatch(catalog, form.courseId, id) })}
            />
            <SectionSelect
              sections={state.sections}
              courseId={form.courseId}
              batch={form.batch}
              value={form.sectionId}
              onChange={(id) => {
                const sec = state.sections.find((s) => s.id === id);
                setForm({ ...form, sectionId: id, year: sec?.year ?? form.year, batch: sec ? batchLabel(sec) : form.batch });
              }}
            />
            <div className="space-y-1">
              <Label>Year of study</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Admission date</Label>
              <Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Bus route</Label>
              <Select
                value={form.busRouteId ?? "none"}
                onValueChange={pick((v) => setForm({ ...form, busRouteId: v === "none" ? undefined : v }))}
                items={{ none: "No bus", ...Object.fromEntries(state.routes.map((r) => [r.id, `${r.name} · ${r.vehicleNo}`])) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bus</SelectItem>
                  {state.routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.vehicleNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={pick((v) => setForm({ ...form, status: v as Student["status"] }))} items={{ active: "Active", left: "Left" }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormSection>
          <FormSection title="Parent / Guardian">
            <div className="space-y-1">
              <Label>Parent / guardian name</Label>
              <Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Parent phone</Label>
              <Input value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Parent email</Label>
              <Input value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
            </div>
          </FormSection>
          <FormSection title="Portal logins">
            <div className="sm:col-span-2 space-y-3">
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <Checkbox checked={createLogin} onCheckedChange={(v) => setCreateLogin(Boolean(v))} />
                Create student login
              </label>
              {createLogin ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Login email</Label>
                    <Input value={form.email} readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>Temporary password</Label>
                    <Input type="password" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} placeholder="Min. 8 characters" />
                  </div>
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Password is sent only to Firebase Authentication. It is not saved in Firestore or this browser after you close the form.
                  </p>
                </div>
              ) : null}
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <Checkbox checked={createParentLogin} onCheckedChange={(v) => setCreateParentLogin(Boolean(v))} />
                Create parent login
              </label>
              {createParentLogin ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Parent login email</Label>
                    <Input value={form.parentEmail} readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>Temporary password</Label>
                    <Input type="password" value={parentPassword} onChange={(e) => setParentPassword(e.target.value)} placeholder="Min. 8 characters" />
                  </div>
                </div>
              ) : null}
            </div>
          </FormSection>
        </div>
      </FormDialog>
    </Guard>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  const items = Object.fromEntries(options.map((o) => [o.id || "all", o.label]));
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value || "all"} onValueChange={pick((v) => onChange(v === "all" ? "" : v))} items={items}>
        <SelectTrigger className="h-11 w-full min-h-11">
          <SelectValue>
            {(selected: string | null) => items[selected ?? "all"] ?? label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id || "all"} value={o.id || "all"}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
