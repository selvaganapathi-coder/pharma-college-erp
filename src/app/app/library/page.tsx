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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import type { Book } from "@/lib/types";

export default function LibraryPage() {
  const { state, save, remove, allowed, scopedStudentId, upload } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("library", "write") && !sid;
  const [bookOpen, setBookOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [form, setForm] = useState<Book | null>(null);
  const [bookId, setBookId] = useState(state.books[0]?.id ?? "");
  const [studentId, setStudentId] = useState(state.students[0]?.id ?? "");
  const checkouts = sid ? state.checkouts.filter((c) => c.studentId === sid) : state.checkouts;

  function copiesLeft(id: string) {
    const book = state.books.find((b) => b.id === id);
    const out = state.checkouts.filter((c) => c.bookId === id && !c.returnedOn).length;
    return (book?.copies ?? 0) - out;
  }

  return (
    <Guard module="library">
      <PageHeader
        title="Library"
        note="Book catalogue with cover photo, copies, issue, return, and fine after due date."
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-[#C41E3A] text-[#C41E3A]"
                onClick={() => {
                  setForm({ id: uid("b"), isbn: "", title: "", author: "", copies: 1 });
                  setBookOpen(true);
                }}
              >
                Add book
              </Button>
              <Button className="bg-[#C41E3A] text-[#FFE566]" onClick={() => setOutOpen(true)}>
                Issue book
              </Button>
            </div>
          ) : null
        }
      />
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="out">Checkouts</TabsTrigger>
        </TabsList>
        <TabsContent value="books">
          <DataTable
            rows={state.books}
            empty="No books."
            canWrite={canWrite}
            filter={(row, q) => !q || `${row.title} ${row.author} ${row.isbn}`.toLowerCase().includes(q)}
            onEdit={(r) => {
              setForm(r);
              setBookOpen(true);
            }}
            onDelete={(r) => void remove("books", r.id, `Deleted book ${r.title}.`)}
            columns={[
              {
                key: "cover",
                header: "Cover",
                cell: (r) =>
                  r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photoUrl} alt="" className="h-12 w-9 object-cover" />
                  ) : (
                    "—"
                  ),
              },
              { key: "title", header: "Title", cell: (r) => r.title },
              { key: "author", header: "Author", cell: (r) => r.author },
              { key: "isbn", header: "ISBN", cell: (r) => r.isbn },
              { key: "left", header: "Free copies", cell: (r) => copiesLeft(r.id) },
            ]}
          />
        </TabsContent>
        <TabsContent value="out">
          <DataTable
            rows={checkouts}
            empty="No checkouts."
            filter={(row, q) => {
              const b = state.books.find((x) => x.id === row.bookId);
              const s = state.students.find((x) => x.id === row.studentId);
              return !q || `${b?.title} ${s?.name}`.toLowerCase().includes(q);
            }}
            columns={[
              { key: "book", header: "Book", cell: (r) => state.books.find((b) => b.id === r.bookId)?.title },
              { key: "st", header: "Student", cell: (r) => state.students.find((s) => s.id === r.studentId)?.name },
              { key: "due", header: "Due", cell: (r) => r.dueOn },
              {
                key: "status",
                header: "Status",
                cell: (r) => {
                  const late = !r.returnedOn && r.dueOn < new Date().toISOString().slice(0, 10);
                  const fine = late ? 20 : 0;
                  return r.returnedOn ? (
                    <Badge className="bg-[#C41E3A] text-[#FFE566]">Returned {r.returnedOn}</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#C41E3A] text-[#FFE566]">{late ? `Overdue · ₹${fine}` : "Out"}</Badge>
                      {canWrite ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#C41E3A] text-[#C41E3A]"
                          onClick={() =>
                            void save(
                              "checkouts",
                              { ...r, returnedOn: new Date().toISOString().slice(0, 10), fine },
                              `Returned book checkout ${r.id}.`,
                            )
                          }
                        >
                          Return
                        </Button>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
          />
        </TabsContent>
      </Tabs>
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="bg-[#FFF8C2]">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">Book</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <PhotoUpload
                label="Cover photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("books", form.id, file)}
              />
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Author</Label>
                <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>ISBN</Label>
                  <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Copies</Label>
                  <Input type="number" value={form.copies} onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })} />
                </div>
              </div>
              <Button
                className="bg-[#C41E3A] text-[#FFE566]"
                onClick={async () => {
                  await save("books", form, `Saved book ${form.title}.`);
                  setBookOpen(false);
                }}
              >
                Save book
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={outOpen} onOpenChange={setOutOpen}>
        <DialogContent className="bg-[#FFF8C2]">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">Issue book</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Book</Label>
              <Select value={bookId} onValueChange={pick(setBookId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={pick(setStudentId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-[#C41E3A] text-[#FFE566]"
              onClick={async () => {
                const due = new Date();
                due.setDate(due.getDate() + 14);
                await save(
                  "checkouts",
                  {
                    id: uid("ch"),
                    bookId,
                    studentId,
                    issuedOn: new Date().toISOString().slice(0, 10),
                    dueOn: due.toISOString().slice(0, 10),
                  },
                  `Issued book ${bookId} to ${studentId}.`,
                );
                setOutOpen(false);
              }}
            >
              Issue for 14 days
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
