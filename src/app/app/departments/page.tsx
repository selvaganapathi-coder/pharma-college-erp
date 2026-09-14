"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SearchTable } from "@/components/search-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";

export default function DepartmentsPage() {
  const { state, mutate, allowed } = useApp();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
  const canWrite = allowed("departments", "write");

  return (
    <Guard module="departments">
      <PageHeader
        title="Departments"
        note="Each pharmacy subject group has a code and a head of department."
        action={
          canWrite ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add department</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New department</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Head of department</Label>
                    <Input value={head} onChange={(e) => setHead(e.target.value)} />
                  </div>
                  <Button
                    className="bg-[#C41E3A] text-white"
                    onClick={() => {
                      mutate((draft) => {
                        draft.departments.push({ id: uid("d"), code, name, head });
                        return `Added department ${name}.`;
                      }, "departments", code);
                      setOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <SearchTable
        rows={state.departments}
        empty="No department found."
        filter={(row, q) => !q || `${row.name} ${row.code} ${row.head}`.toLowerCase().includes(q)}
        columns={[
          { key: "code", header: "Code", cell: (r) => r.code },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "head", header: "Head", cell: (r) => r.head },
        ]}
      />
    </Guard>
  );
}
