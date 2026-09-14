"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SearchTable } from "@/components/search-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";
import { pick } from "@/lib/pick";

export default function StaffPage() {
  const { state, mutate, allowed } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("Lecturer");
  const [departmentId, setDepartmentId] = useState("d1");
  const canWrite = allowed("staff", "write");

  return (
    <Guard module="staff">
      <PageHeader
        title="Staff records"
        note="Teachers, office staff, and library staff. Only admin can add a new staff member."
        action={
          canWrite ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add staff</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New staff</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={pick(setDepartmentId)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {state.departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-[#C41E3A] text-white"
                    onClick={() => {
                      mutate((draft) => {
                        const id = uid("t");
                        draft.staff.unshift({
                          id,
                          staffCode: `STF${String(draft.staff.length + 1).padStart(3, "0")}`,
                          name,
                          email,
                          phone,
                          title,
                          departmentId,
                          joinedOn: new Date().toISOString().slice(0, 10),
                          status: "active",
                        });
                        return `Added staff ${name}.`;
                      }, "staff", email);
                      setOpen(false);
                    }}
                  >
                    Save staff
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <SearchTable
        rows={state.staff}
        empty="No staff matches this search."
        filter={(row, q) => !q || `${row.name} ${row.staffCode} ${row.email} ${row.title}`.toLowerCase().includes(q)}
        columns={[
          { key: "code", header: "Code", cell: (r) => r.staffCode },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "title", header: "Title", cell: (r) => r.title },
          {
            key: "dept",
            header: "Department",
            cell: (r) => state.departments.find((d) => d.id === r.departmentId)?.name,
          },
          { key: "phone", header: "Phone", cell: (r) => r.phone },
          { key: "status", header: "Status", cell: (r) => r.status },
        ]}
      />
    </Guard>
  );
}
