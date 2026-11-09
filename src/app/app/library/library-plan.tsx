"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentSelect } from "@/components/linked-selects";
import { pick } from "@/lib/pick";
import { uid } from "@/lib/store";
import type { AppState, Book } from "@/lib/types";
import { toast } from "sonner";

export const PHARMACY_SHELVES = ["Pharmaceutics", "Pharmaceutical Chemistry", "Pharmacology", "Pharmacognosy", "Pharmacy Practice"] as const;

const STEPS = [
  "Catalogue the pharmacy collection",
  "Admit the borrower first",
  "Issue the book for 14 days",
  "Let the student and parent see the loan",
  "Watch the four counters",
  "Return the book and record a late fine",
  "Follow up on overdue loans",
] as const;

type Save = (key: "books" | "checkouts", row: AppState["books"][number] | AppState["checkouts"][number], details: string) => Promise<{ ok: boolean }>;

export function LibraryPlan({
  state,
  canWrite,
  save,
}: {
  state: AppState;
  canWrite: boolean;
  save: Save;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Book>({ id: uid("b"), isbn: "", title: "", author: "", copies: 1, subject: PHARMACY_SHELVES[0] });
  const [bookId, setBookId] = useState("");
  const [studentId, setStudentId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const books = state.books.filter((b) => !b.deletedAt);
  const borrowers = state.students.filter((s) => !s.deletedAt && s.status === "active" && s.rollNo.trim());
  const openLoans = state.checkouts.filter((c) => !c.returnedOn);
  const overdue = openLoans.filter((c) => c.dueOn < today);

  function copiesLeft(id: string) {
    const book = state.books.find((b) => b.id === id);
    const out = state.checkouts.filter((c) => c.bookId === id && !c.returnedOn).length;
    return (book?.copies ?? 0) - out;
  }

  async function addTitle() {
    if (!draft.title.trim()) {
      toast.error("Enter the book title.");
      return;
    }
    const result = await save("books", { ...draft, title: draft.title.trim() }, `Saved book ${draft.title}.`);
    if (!result.ok) return;
    toast.success("Title added to the catalogue.");
    setDraft({ id: uid("b"), isbn: "", title: "", author: "", copies: 1, subject: draft.subject });
    setStep(1);
  }

  async function issue() {
    const book = books.find((b) => b.id === bookId);
    const student = borrowers.find((s) => s.id === studentId);
    if (!book || !student) {
      toast.error("Choose a catalogue title and a student who has a roll number.");
      return;
    }
    if (copiesLeft(book.id) <= 0) {
      toast.error("No free copy of this title. Wait for a return before issuing it again.");
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const result = await save(
      "checkouts",
      { id: uid("ch"), bookId: book.id, studentId: student.id, issuedOn: today, dueOn: due.toISOString().slice(0, 10) },
      `Issued ${book.title} to ${student.name}.`,
    );
    if (!result.ok) return;
    toast.success("Book issued for 14 days.");
    setStep(3);
  }

  async function markReturned(row: AppState["checkouts"][number]) {
    const late = row.dueOn < today;
    const result = await save(
      "checkouts",
      { ...row, returnedOn: today, fine: late ? 20 : 0 },
      `Returned ${state.books.find((b) => b.id === row.bookId)?.title ?? "book"}.`,
    );
    if (result.ok) toast.success(late ? "Returned. ₹20 fine recorded." : "Returned.");
  }

  return (
    <div className="erp-card p-4 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-1 text-lg font-semibold text-primary">{STEPS[step]}</h2>
      <div className="mt-4">{step === 0 ? <Catalogue draft={draft} setDraft={setDraft} canWrite={canWrite} onSave={() => void addTitle()} /> : null}
        {step === 1 ? <Borrowers borrowers={borrowers} blocked={state.students.filter((s) => !s.deletedAt && !s.rollNo.trim())} /> : null}
        {step === 2 ? (
          <IssueStep
            books={books}
            borrowers={borrowers}
            bookId={bookId}
            studentId={studentId}
            setBookId={setBookId}
            setStudentId={setStudentId}
            copiesLeft={copiesLeft}
            canWrite={canWrite}
            onIssue={() => void issue()}
          />
        ) : null}
        {step === 3 ? <PortalView state={state} /> : null}
        {step === 4 ? <Counters books={books} checkouts={state.checkouts} today={today} /> : null}
        {step === 5 ? <Returns state={state} openLoans={openLoans} today={today} canWrite={canWrite} onReturn={(row) => void markReturned(row)} /> : null}
        {step === 6 ? <Overdue state={state} overdue={overdue} copiesLeft={copiesLeft} /> : null}
      </div>
      <div className="mt-6 flex gap-2">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((n) => Math.max(0, n - 1))}>
          Previous
        </Button>
        <Button type="button" disabled={step === STEPS.length - 1} onClick={() => setStep((n) => Math.min(STEPS.length - 1, n + 1))}>
          Next
        </Button>
      </div>
    </div>
  );
}

function Catalogue({
  draft,
  setDraft,
  canWrite,
  onSave,
}: {
  draft: Book;
  setDraft: (book: Book) => void;
  canWrite: boolean;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <p className="text-sm text-muted-foreground sm:col-span-2">Add one pharmacy title. Pick its shelf, then save. You can add the next title after this one.</p>
      <div className="space-y-1 sm:col-span-2">
        <Label>Shelf</Label>
        <Select value={draft.subject} onValueChange={pick((value) => setDraft({ ...draft, subject: value }))} items={Object.fromEntries(PHARMACY_SHELVES.map((shelf) => [shelf, shelf]))}>
          <SelectTrigger><SelectValue>{(v: string | null) => v || "Shelf"}</SelectValue></SelectTrigger>
          <SelectContent>
            {PHARMACY_SHELVES.map((shelf) => <SelectItem key={shelf} value={shelf}>{shelf}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Title</Label>
        <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Author</Label>
        <Input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>ISBN</Label>
        <Input value={draft.isbn} onChange={(e) => setDraft({ ...draft, isbn: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Copies</Label>
        <Input type="number" min={1} value={draft.copies} onChange={(e) => setDraft({ ...draft, copies: Number(e.target.value) })} />
      </div>
      {canWrite ? <Button type="button" className="sm:col-span-2" onClick={onSave}>Save this title</Button> : <p className="text-sm text-muted-foreground sm:col-span-2">Only the office can add titles.</p>}
    </div>
  );
}

function Borrowers({ borrowers, blocked }: { borrowers: AppState["students"]; blocked: AppState["students"] }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">A book can be issued only to an active student who already has a roll number.</p>
      {borrowers.length === 0 ? <p>No student is ready. Admit one under Students first.</p> : (
        <ul className="space-y-2">
          {borrowers.map((s) => <li key={s.id} className="rounded-xl border border-border px-3 py-2">{s.name} · {s.rollNo}</li>)}
        </ul>
      )}
      {blocked.length ? <p className="text-muted-foreground">{blocked.length} student record(s) have no roll number, so they cannot borrow yet.</p> : null}
      <Link href="/app/students" className="inline-block font-semibold text-primary">Open Students</Link>
    </div>
  );
}

function IssueStep({
  books,
  borrowers,
  bookId,
  studentId,
  setBookId,
  setStudentId,
  copiesLeft,
  canWrite,
  onIssue,
}: {
  books: Book[];
  borrowers: AppState["students"];
  bookId: string;
  studentId: string;
  setBookId: (id: string) => void;
  setStudentId: (id: string) => void;
  copiesLeft: (id: string) => number;
  canWrite: boolean;
  onIssue: () => void;
}) {
  const available = books.filter((b) => copiesLeft(b.id) > 0);
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Pick one title that still has a free copy and one admitted student. The due date is 14 days from today.</p>
      <Select value={bookId} onValueChange={pick(setBookId)} items={Object.fromEntries(available.map((b) => [b.id, b.title]))}>
        <SelectTrigger><SelectValue>{(v: string | null) => books.find((b) => b.id === v)?.title ?? "Select book"}</SelectValue></SelectTrigger>
        <SelectContent>
          {available.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} · {copiesLeft(b.id)} free</SelectItem>)}
        </SelectContent>
      </Select>
      <StudentSelect students={borrowers.map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo }))} value={studentId} onChange={setStudentId} />
      {available.length === 0 ? <p className="text-sm text-muted-foreground">Every copy is already out. Return one before issuing again.</p> : null}
      {canWrite ? <Button type="button" onClick={onIssue} disabled={!bookId || !studentId || available.length === 0}>Issue for 14 days</Button> : null}
    </div>
  );
}

function PortalView({ state }: { state: AppState }) {
  const open = state.checkouts.filter((c) => !c.returnedOn);
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">The student portal and the parent portal list only this borrower’s loans. They cannot add titles or issue books.</p>
      {open.length === 0 ? <p>No open loan yet. Issue a book on the previous step, then open Student or Parent and choose Library.</p> : (
        <ul className="space-y-2">
          {open.map((c) => {
            const book = state.books.find((b) => b.id === c.bookId);
            const student = state.students.find((s) => s.id === c.studentId);
            return <li key={c.id} className="rounded-xl border border-border px-3 py-2">{book?.title ?? "Book"} · {student?.name ?? "Student"} · due {c.dueOn}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

function Counters({ books, checkouts, today }: { books: Book[]; checkouts: AppState["checkouts"]; today: string }) {
  const issued = checkouts.filter((c) => !c.returnedOn);
  const totalCopies = books.reduce((sum, b) => sum + b.copies, 0);
  const items = [
    ["Total books", books.length],
    ["Issued", issued.length],
    ["Overdue", issued.filter((c) => c.dueOn < today).length],
    ["Available copies", Math.max(0, totalCopies - issued.length)],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border px-3 py-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-primary">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Returns({
  state,
  openLoans,
  today,
  canWrite,
  onReturn,
}: {
  state: AppState;
  openLoans: AppState["checkouts"];
  today: string;
  canWrite: boolean;
  onReturn: (row: AppState["checkouts"][number]) => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">Return one loan at a time. A book past its due date stores a ₹20 fine and frees the copy.</p>
      {openLoans.length === 0 ? <p>Nothing is out.</p> : openLoans.map((row) => {
        const late = row.dueOn < today;
        const book = state.books.find((b) => b.id === row.bookId);
        const student = state.students.find((s) => s.id === row.studentId);
        return (
          <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
            <span>{book?.title ?? "Book"} · {student?.name ?? "Student"} · due {row.dueOn}{late ? " · ₹20" : ""}</span>
            {canWrite ? <Button type="button" size="sm" variant="outline" onClick={() => onReturn(row)}>Return</Button> : null}
          </div>
        );
      })}
    </div>
  );
}

function Overdue({
  state,
  overdue,
  copiesLeft,
}: {
  state: AppState;
  overdue: AppState["checkouts"];
  copiesLeft: (id: string) => number;
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">Ask for these copies back before issuing the same title again when none are free.</p>
      {overdue.length === 0 ? <p>No overdue loan.</p> : overdue.map((row) => {
        const book = state.books.find((b) => b.id === row.bookId);
        const student = state.students.find((s) => s.id === row.studentId);
        const left = copiesLeft(row.bookId);
        return (
          <p key={row.id} className="rounded-xl border border-border px-3 py-2">
            {student?.name ?? "Student"} still has {book?.title ?? "a book"} due {row.dueOn}. {left <= 0 ? "No free copy left, so do not issue this title again yet." : `${left} free.`}
          </p>
        );
      })}
    </div>
  );
}
