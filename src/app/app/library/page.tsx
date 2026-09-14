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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";
import { pick } from "@/lib/pick";

export default function LibraryPage() {
  const { state, mutate, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("library", "write") && !sid;
  const [bookOpen, setBookOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [copies, setCopies] = useState("1");
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
        note="Track books and student checkouts. Staff can issue and return. Students see only their books."
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Dialog open={bookOpen} onOpenChange={setBookOpen}>
                <DialogTrigger render={<Button variant="outline" />}>Add book</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New book</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Author</Label>
                      <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>ISBN</Label>
                      <Input value={isbn} onChange={(e) => setIsbn(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Copies</Label>
                      <Input value={copies} onChange={(e) => setCopies(e.target.value)} />
                    </div>
                    <Button
                      className="bg-[#C41E3A] text-white"
                      onClick={() => {
                        mutate((draft) => {
                          draft.books.push({
                            id: uid("b"),
                            title,
                            author,
                            isbn,
                            copies: Number(copies) || 1,
                          });
                          return `Added book ${title}.`;
                        }, "library", isbn);
                        setBookOpen(false);
                      }}
                    >
                      Save book
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={outOpen} onOpenChange={setOutOpen}>
                <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Issue book</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Issue to student</DialogTitle>
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
                              {s.name} ({s.rollNo})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="bg-[#C41E3A] text-white"
                      onClick={() => {
                        const issuedOn = new Date().toISOString().slice(0, 10);
                        const due = new Date();
                        due.setDate(due.getDate() + 14);
                        mutate((draft) => {
                          draft.checkouts.unshift({
                            id: uid("ch"),
                            bookId,
                            studentId,
                            issuedOn,
                            dueOn: due.toISOString().slice(0, 10),
                          });
                          return `Issued book ${bookId} to ${studentId}.`;
                        }, "checkouts", studentId);
                        setOutOpen(false);
                      }}
                    >
                      Issue for 14 days
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
          <SearchTable
            rows={state.books}
            empty="No books in the catalogue."
            filter={(row, q) => !q || `${row.title} ${row.author} ${row.isbn}`.toLowerCase().includes(q)}
            columns={[
              { key: "title", header: "Title", cell: (r) => r.title },
              { key: "author", header: "Author", cell: (r) => r.author },
              { key: "isbn", header: "ISBN", cell: (r) => r.isbn },
              { key: "left", header: "Free copies", cell: (r) => copiesLeft(r.id) },
            ]}
          />
        </TabsContent>
        <TabsContent value="out">
          <SearchTable
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
                cell: (r) =>
                  r.returnedOn ? (
                    <Badge className="bg-[#EAB308] text-[#4A1C1C]">Returned {r.returnedOn}</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#C41E3A]">Out</Badge>
                      {canWrite ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            mutate((draft) => {
                              const found = draft.checkouts.find((c) => c.id === r.id);
                              if (found) found.returnedOn = new Date().toISOString().slice(0, 10);
                              return `Returned checkout ${r.id}.`;
                            }, "checkouts", r.id)
                          }
                        >
                          Return
                        </Button>
                      ) : null}
                    </div>
                  ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </Guard>
  );
}
