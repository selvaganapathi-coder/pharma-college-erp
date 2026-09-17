"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { PhotoUpload } from "@/components/photo-upload";
import { Button } from "@/components/ui/button";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookLabel, StudentLabel } from "@/components/ref-label";
import { StudentSelect } from "@/components/linked-selects";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import { toast } from "sonner";
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setForm({ id: uid("b"), isbn: "", title: "", author: "", copies: 1 });
                  setBookOpen(true);
                }}
              >
                Add book
              </Button>
              <Button onClick={() => setOutOpen(true)}>Issue book</Button>
            </div>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total books" value={`${state.books.filter((b) => !b.deletedAt).length}`} />
        <StatCard title="Issued" value={`${state.checkouts.filter((c) => !c.returnedOn).length}`} />
        <StatCard title="Overdue" value={`${state.checkouts.filter((c) => !c.returnedOn && c.dueOn < new Date().toISOString().slice(0, 10)).length}`} />
        <StatCard title="Available copies" value={`${Math.max(0, state.books.reduce((s, b) => s + (b.deletedAt ? 0 : b.copies), 0) - state.checkouts.filter((c) => !c.returnedOn).length)}`} />
      </div>
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="out">Checkouts</TabsTrigger>
        </TabsList>
        <TabsContent value="books">
          <DataTable
            rows={state.books}
            empty="No books yet. Add the first catalogue title."
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
            empty="No issues yet. Issue a book to a student."
            mobileTitle={(r) => state.books.find((b) => b.id === r.bookId)?.title ?? "Book"}
            filter={(row, q) => {
              const b = state.books.find((x) => x.id === row.bookId);
              const s = state.students.find((x) => x.id === row.studentId);
              return !q || `${b?.title} ${s?.name}`.toLowerCase().includes(q);
            }}
            columns={[
              { key: "book", header: "Book", cell: (r) => <BookLabel id={r.bookId} /> },
              { key: "st", header: "Borrower", cell: (r) => <StudentLabel id={r.studentId} /> },
              { key: "due", header: "Due", cell: (r) => r.dueOn },
              {
                key: "status",
                header: "Status",
                cell: (r) => {
                  const late = !r.returnedOn && r.dueOn < new Date().toISOString().slice(0, 10);
                  const fine = late ? 20 : 0;
                  return r.returnedOn ? (
                    <Badge>Returned {r.returnedOn}</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge>{late ? `Overdue · ₹${fine}` : "Out"}</Badge>
                      {canWrite ? (
                        <Button
                          size="sm"
                          variant="outline"
                          
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
      <FormDialog
        open={bookOpen}
        onOpenChange={setBookOpen}
        title={form && state.books.some((b) => b.id === form.id) ? "Edit Book" : "Add Book"}
        description="Catalogue title with copies available for issue."
        submitLabel="Save book"
        onSubmit={async () => {
          if (!form?.title) return;
          const result = await save("books", form, `Saved book ${form.title}.`);
          if (!result.ok) return;
          toast.success("Book saved successfully.");
          setBookOpen(false);
        }}
      >
        {form ? (
          <FormSection title="Catalogue">
            <div className="sm:col-span-2">
              <PhotoUpload
                label="Cover photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("books", form.id, file)}
              />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Author</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>ISBN</Label>
              <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Copies</Label>
              <Input type="number" value={form.copies} onChange={(e) => setForm({ ...form, copies: Number(e.target.value) })} />
            </div>
          </FormSection>
        ) : null}
      </FormDialog>
      <FormDialog
        open={outOpen}
        onOpenChange={setOutOpen}
        title="Issue book"
        description="Issue is recorded against the student name and admission number."
        submitLabel="Issue for 14 days"
        onSubmit={async () => {
          if (!bookId || !studentId) {
            toast.error("Select a book and a student.");
            return;
          }
          const due = new Date();
          due.setDate(due.getDate() + 14);
          const result = await save(
            "checkouts",
            {
              id: uid("ch"),
              bookId,
              studentId,
              issuedOn: new Date().toISOString().slice(0, 10),
              dueOn: due.toISOString().slice(0, 10),
            },
            `Issued ${state.books.find((b) => b.id === bookId)?.title ?? "book"} to ${state.students.find((s) => s.id === studentId)?.name ?? "student"}.`,
          );
          if (!result.ok) return;
          toast.success("Book issued.");
          setOutOpen(false);
        }}
      >
        <FormSection title="Issue">
          <div className="space-y-1 sm:col-span-2">
            <Label>Book</Label>
            <Select
              value={bookId}
              onValueChange={pick(setBookId)}
              items={Object.fromEntries(state.books.map((b) => [b.id, b.title]))}
            >
              <SelectTrigger>
                <SelectValue>{(v: string | null) => state.books.find((b) => b.id === v)?.title ?? "Select book"}</SelectValue>
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
          <div className="sm:col-span-2">
            <StudentSelect
              students={state.students.filter((s) => !s.deletedAt).map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo }))}
              value={studentId}
              onChange={setStudentId}
            />
          </div>
        </FormSection>
      </FormDialog>
    </Guard>
  );
}
