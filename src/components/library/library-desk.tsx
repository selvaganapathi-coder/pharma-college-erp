"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
const PHARMACY_SHELVES = ["Pharmaceutics", "Pharmaceutical Chemistry", "Pharmacology", "Pharmacognosy", "Pharmacy Practice"];
import {
  availableBarcodes,
  canIssue,
  canRenew,
  isOverdue,
  loadLibraryRules,
  loadReservations,
  memberLoans,
  openLoans,
  saveLibraryRules,
  saveReservations,
  type LibraryRules,
  type MemberKind,
  type Reservation,
} from "@/lib/library-rules";
import type { Book, Checkout } from "@/lib/types";
import { toast } from "sonner";

type View = "dashboard" | "catalog" | "book" | "members" | "circulation" | "rules" | "reports";

export function LibraryDesk({ mode = "desk", view: fixedView }: { mode?: "desk" | "student" | "faculty"; view?: View }) {
  const { state, save, allowed, user } = useApp();
  const router = useRouter();
  const [view, setView] = useState<View>(fixedView ?? (mode === "desk" ? "dashboard" : "catalog"));
  const shown = fixedView ?? view;
  function openView(next: View) {
    if (fixedView) {
      router.push(next === "dashboard" ? "/library" : `/library/${next}`);
      return;
    }
    setView(next);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rules, setRules] = useState<LibraryRules>(() => loadLibraryRules());
  const [reservations, setReservations] = useState<Reservation[]>(() => loadReservations());
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState("All");
  const [onlyFree, setOnlyFree] = useState(false);
  const canWrite = mode === "desk" && allowed("library", "write");
  const today = new Date().toISOString().slice(0, 10);
  const books = state.books.filter((book) => !book.deletedAt);
  const loans = openLoans(state.checkouts);
  const memberId = mode === "student" ? user?.studentId || user?.childStudentId : mode === "faculty" ? user?.staffId : undefined;

  function remember(next: Reservation[]) {
    setReservations(next);
    saveReservations(next);
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      const free = availableBarcodes(book, state.checkouts).length > 0;
      const hay = `${book.title} ${book.author} ${book.isbn} ${book.subject ?? ""} ${book.course ?? ""} ${book.semester ?? ""} ${book.resourceType ?? "Book"}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (resource !== "All" && (book.resourceType ?? "Book") !== resource) return false;
      if (onlyFree && !free) return false;
      return true;
    });
  }, [books, query, resource, onlyFree, state.checkouts]);

  const selected = books.find((book) => book.id === selectedId) ?? null;

  async function issue(book: Book, member: { id: string; name: string; kind: MemberKind }, override = false) {
    const decision = canIssue({ rules, book, checkouts: state.checkouts, memberId: member.id, today, kind: member.kind, override });
    if (!decision.ok) {
      toast.error(decision.error);
      return;
    }
    const row: Checkout = {
      id: uid("ch"),
      bookId: book.id,
      studentId: member.kind === "student" ? member.id : "",
      staffId: member.kind === "faculty" ? member.id : undefined,
      issuedOn: today,
      dueOn: decision.dueOn,
      barcode: decision.barcode,
      renewals: 0,
    };
    const result = await save("checkouts", row, `Issued ${book.title} to ${member.name}.`);
    if (!result.ok) return;
    if (override && rules.recordOverride) toast.success("Issued. The overdue override was recorded.");
    else toast.success(`Issued until ${decision.dueOn}.`);
  }

  async function giveBack(row: Checkout) {
    const late = isOverdue(row, today);
    const fine = late ? rules.fineAmount : 0;
    const result = await save("checkouts", { ...row, returnedOn: today, fine }, "Returned a library copy.");
    if (!result.ok) return;
    const waiting = reservations.find((item) => item.bookId === row.bookId && item.status === "waiting");
    if (waiting) remember(reservations.map((item) => (item.id === waiting.id ? { ...item, status: "ready" } : item)));
    toast.success(late ? `Returned. Fine ₹${fine}.` : waiting ? `Returned. ${waiting.memberName} is next in the queue.` : "Returned.");
  }

  async function renew(row: Checkout, kind: MemberKind) {
    const decision = canRenew(rules, row, today, kind);
    if (!decision.ok) {
      toast.error(decision.error);
      return;
    }
    const result = await save("checkouts", { ...row, dueOn: decision.dueOn, renewals: (row.renewals ?? 0) + 1 }, "Renewed a library loan.");
    if (result.ok) toast.success(`New due date ${decision.dueOn}.`);
  }

  function reserve(book: Book, member: { id: string; name: string; kind: MemberKind }) {
    if (!rules.allowReserve) {
      toast.error("Reservations are turned off.");
      return;
    }
    remember([...reservations, { id: uid("rsv"), bookId: book.id, memberId: member.id, memberName: member.name, memberKind: member.kind, at: today, status: "waiting" }]);
    toast.success("Reservation placed.");
  }

  if (mode !== "desk") {
    const mine = memberId ? memberLoans(state.checkouts, memberId) : [];
    const kind: MemberKind = mode === "faculty" ? "faculty" : "student";
    const self = { id: memberId ?? "", name: user?.name ?? "Member", kind };
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-[#1f2533]">Library catalog</h1>
        <CatalogFilters query={query} setQuery={setQuery} resource={resource} setResource={setResource} onlyFree={onlyFree} setOnlyFree={setOnlyFree} />
        <BookList books={results} checkouts={state.checkouts} onOpen={setSelectedId} />
        {selected ? <BookDetail book={selected} checkouts={state.checkouts} canEdit={false} onIssue={() => void issue(selected, self)} onReserve={() => reserve(selected, self)} /> : null}
        <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
          <h2 className="font-semibold text-[#1f2533]">My loans</h2>
          {mine.length === 0 ? <p className="mt-2 text-sm text-[#667085]">No books out.</p> : mine.map((row) => (
            <div key={row.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{state.books.find((book) => book.id === row.bookId)?.title} · due {row.dueOn}{isOverdue(row, today) ? " · overdue" : ""}</span>
              <Button size="sm" variant="outline" onClick={() => void renew(row, kind)}>Request renewal</Button>
            </div>
          ))}
        </section>
        {mode === "faculty" ? <Recommend /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shown === "dashboard" ? <Dashboard books={books} checkouts={state.checkouts} reservations={reservations} today={today} onJump={openView} /> : null}
      {shown === "catalog" || shown === "book" ? (
        <div className="space-y-3">
          <CatalogFilters query={query} setQuery={setQuery} resource={resource} setResource={setResource} onlyFree={onlyFree} setOnlyFree={setOnlyFree} />
          {canWrite ? <AddBook onSave={(book) => void save("books", book, `Saved book ${book.title}.`)} /> : null}
          <BookList books={results} checkouts={state.checkouts} onOpen={setSelectedId} />
          {selected ? <BookDetail book={selected} checkouts={state.checkouts} canEdit={canWrite} onIssue={() => openView("circulation")} onReserve={() => openView("circulation")} /> : null}
        </div>
      ) : null}
      {shown === "members" ? <Members stateStudents={state.students} stateStaff={state.staff} checkouts={state.checkouts} reservations={reservations} today={today} canWrite={canWrite} onSaveStudent={(row) => void save("students", row, `Registered ${row.name}.`)} onSaveStaff={(row) => void save("staff", row, `Registered ${row.name}.`)} /> : null}
      {shown === "circulation" ? (
        <Circulation
          books={books}
          students={state.students}
          staff={state.staff}
          checkouts={state.checkouts}
          reservations={reservations}
          rules={rules}
          today={today}
          onIssue={(book, member, override) => void issue(book, member, override)}
          onReturn={(row) => void giveBack(row)}
          onRenew={(row, kind) => void renew(row, kind)}
          onReserve={(book, member) => reserve(book, member)}
        />
      ) : null}
      {shown === "rules" ? <RulesEditor rules={rules} canWrite={canWrite} onSave={(next) => { setRules(next); saveLibraryRules(next); toast.success("Library rules saved."); }} /> : null}
      {shown === "reports" ? <Reports books={books} checkouts={state.checkouts} today={today} rules={rules} reservations={reservations} /> : null}
    </div>
  );
}

function Dashboard({
  books,
  checkouts,
  reservations,
  today,
  onJump,
}: {
  books: Book[];
  checkouts: Checkout[];
  reservations: Reservation[];
  today: string;
  onJump: (view: View) => void;
}) {
  const loans = openLoans(checkouts);
  const copies = books.reduce((sum, book) => sum + book.copies, 0);
  const available = books.reduce((sum, book) => sum + availableBarcodes(book, checkouts).length, 0);
  const cards = [
    ["Titles", books.length],
    ["Physical copies", copies],
    ["Available", available],
    ["On loan", loans.length],
    ["Overdue", loans.filter((row) => isOverdue(row, today)).length],
    ["Reservations", reservations.filter((row) => row.status !== "ready").length + reservations.filter((row) => row.status === "ready").length],
  ] as const;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#1f2533]">Librarian dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#e6e9ef] bg-white px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-[#667085] uppercase">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#1f2533]">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onJump("catalog")}>Add book</Button>
        <Button variant="outline" onClick={() => onJump("circulation")}>Issue book</Button>
        <Button variant="outline" onClick={() => onJump("circulation")}>Return book</Button>
        <Button variant="outline" onClick={() => onJump("members")}>Register member</Button>
      </div>
    </div>
  );
}

function CatalogFilters(props: {
  query: string;
  setQuery: (value: string) => void;
  resource: string;
  setResource: (value: string) => void;
  onlyFree: boolean;
  setOnlyFree: (value: boolean) => void;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[#e6e9ef] bg-white p-3 sm:grid-cols-[1fr_180px_auto]">
      <Input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search title, author, ISBN, subject, course, semester" />
      <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={props.resource} onChange={(event) => props.setResource(event.target.value)}>
        {["All", "Book", "Journal", "Reference", "Rare"].map((item) => <option key={item}>{item}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-[#3e4657]">
        <input type="checkbox" checked={props.onlyFree} onChange={(event) => props.setOnlyFree(event.target.checked)} />
        Available only
      </label>
    </div>
  );
}

function BookList({ books, checkouts, onOpen }: { books: Book[]; checkouts: Checkout[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e6e9ef] bg-white">
      {books.length === 0 ? <p className="p-4 text-sm text-[#667085]">No titles match.</p> : books.map((book) => {
        const free = availableBarcodes(book, checkouts).length;
        return (
          <button key={book.id} type="button" onClick={() => onOpen(book.id)} className="flex w-full items-start justify-between gap-3 border-b border-[#eef1f6] px-4 py-3 text-left last:border-0 hover:bg-[#f8fafc]">
            <span>
              <span className="block font-medium text-[#1f2533]">{book.title}</span>
              <span className="text-xs text-[#667085]">{book.author} · {book.edition || "Edition not set"} · {book.resourceType ?? "Book"} · {book.shelf || book.subject || "Shelf not set"}</span>
            </span>
            <span className="text-xs font-semibold text-[#1b6de0]">{free} available</span>
          </button>
        );
      })}
    </div>
  );
}

function BookDetail({
  book,
  checkouts,
  canEdit,
  onIssue,
  onReserve,
}: {
  book: Book;
  checkouts: Checkout[];
  canEdit: boolean;
  onIssue: () => void;
  onReserve: () => void;
}) {
  const copies = availableBarcodes(book, checkouts);
  const out = openLoans(checkouts).filter((row) => row.bookId === book.id);
  return (
    <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
      <h2 className="text-lg font-semibold text-[#1f2533]">{book.title}</h2>
      <p className="text-sm text-[#667085]">{book.author} · {book.edition || "—"} · ISBN {book.isbn || "—"}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>Call number: {book.callNumber || "—"}</div>
        <div>Shelf: {book.shelf || book.subject || "—"}</div>
        <div>Type: {book.resourceType ?? "Book"}</div>
        <div>Course: {book.course || "—"} {book.semester || ""}</div>
        <div>Copies: {book.copies} · free {copies.length} · on loan {out.length}</div>
        <div>{book.resourceType === "Reference" || book.resourceType === "Rare" ? "Reference use only unless the rules allow it to leave." : "Can be borrowed."}</div>
      </dl>
      <ul className="mt-3 space-y-1 text-sm">
        {out.map((row) => <li key={row.id}>{row.barcode || "Copy"} · due {row.dueOn} · {row.studentId || row.staffId}</li>)}
        {copies.map((code) => <li key={code}>{code} · on shelf</li>)}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button onClick={onIssue}>{canEdit ? "Issue" : "Borrow"}</Button>
        <Button variant="outline" onClick={onReserve}>Reserve</Button>
      </div>
    </section>
  );
}

function AddBook({ onSave }: { onSave: (book: Book) => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [subject, setSubject] = useState<string>(PHARMACY_SHELVES[0]);
  const [copies, setCopies] = useState(1);
  const [resourceType, setResourceType] = useState<Book["resourceType"]>("Book");
  return (
    <form
      className="grid gap-2 rounded-lg border border-[#e6e9ef] bg-white p-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onSave({ id: uid("b"), title: title.trim(), author, isbn, subject, copies, resourceType, shelf: subject, edition: "", callNumber: "", course: "", semester: "" });
        setTitle("");
        setAuthor("");
      }}
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" required />
      <Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author" />
      <Input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="ISBN" />
      <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={subject} onChange={(event) => setSubject(event.target.value)}>
        {PHARMACY_SHELVES.map((shelf) => <option key={shelf}>{shelf}</option>)}
      </select>
      <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={resourceType} onChange={(event) => setResourceType(event.target.value as Book["resourceType"])}>
        {["Book", "Journal", "Reference", "Rare"].map((item) => <option key={item}>{item}</option>)}
      </select>
      <Input type="number" min={1} value={copies} onChange={(event) => setCopies(Number(event.target.value))} />
      <Button type="submit" className="sm:col-span-3">Save title</Button>
    </form>
  );
}

function Members(props: {
  stateStudents: { id: string; name: string; rollNo: string; status: string; deletedAt?: string; departmentId: string; courseId: string; year: number }[];
  stateStaff: { id: string; name: string; staffCode: string; deletedAt?: string; departmentId: string; status: string }[];
  checkouts: Checkout[];
  reservations: Reservation[];
  today: string;
  canWrite: boolean;
  onSaveStudent: (row: import("@/lib/types").Student) => void;
  onSaveStaff: (row: import("@/lib/types").Staff) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<MemberKind>("student");
  const students = props.stateStudents.filter((row) => !row.deletedAt);
  const faculty = props.stateStaff.filter((row) => !row.deletedAt);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-[#1f2533]">Members</h1>
      <p className="text-sm text-[#667085]">Students and faculty are registered here. In a full college rollout they can also be imported from the existing student and staff lists. The librarian creates them for this first release.</p>
      {props.canWrite ? (
        <form
          className="grid gap-2 rounded-lg border border-[#e6e9ef] bg-white p-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (kind === "student") {
              props.onSaveStudent({
                id: uid("st"),
                rollNo: code,
                name,
                email: "",
                phone: "",
                gender: "Female",
                dob: "",
                bloodGroup: "",
                parentName: "",
                parentPhone: "",
                parentEmail: "",
                departmentId: "",
                courseId: "",
                sectionId: "",
                year: 1,
                address: "",
                admissionDate: props.today,
                status: "active",
              });
            } else {
              props.onSaveStaff({
                id: uid("t"),
                staffCode: code,
                name,
                email: "",
                phone: "",
                title: "Faculty",
                qualification: "",
                departmentId: "",
                courseIds: [],
                joinedOn: props.today,
                status: "active",
              });
            }
            setName("");
            setCode("");
          }}
        >
          <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value as MemberKind)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" required />
          <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="College ID" required />
          <Button type="submit">Register member</Button>
        </form>
      ) : null}
      {[...students.map((row) => ({ id: row.id, name: row.name, code: row.rollNo, kind: "Student" as const, meta: `Year ${row.year}` })), ...faculty.map((row) => ({ id: row.id, name: row.name, code: row.staffCode, kind: "Faculty" as const, meta: "Faculty" }))].map((member) => {
        const loans = memberLoans(props.checkouts, member.id);
        return (
          <article key={member.id} className="rounded-lg border border-[#e6e9ef] bg-white p-3 text-sm">
            <p className="font-semibold text-[#1f2533]">{member.name} · {member.code || "No college ID"}</p>
            <p className="text-[#667085]">{member.kind} · {member.meta} · {loans.length ? "Active" : "Clear"}</p>
            <p className="mt-1">Current loans: {loans.map((row) => row.dueOn).join(", ") || "none"}</p>
            <p>Reservations: {props.reservations.filter((row) => row.memberId === member.id).length}</p>
          </article>
        );
      })}
    </div>
  );
}

function Circulation(props: {
  books: Book[];
  students: { id: string; name: string; rollNo: string; deletedAt?: string; status: string }[];
  staff: { id: string; name: string; deletedAt?: string }[];
  checkouts: Checkout[];
  reservations: Reservation[];
  rules: LibraryRules;
  today: string;
  onIssue: (book: Book, member: { id: string; name: string; kind: MemberKind }, override?: boolean) => void;
  onReturn: (row: Checkout) => void;
  onRenew: (row: Checkout, kind: MemberKind) => void;
  onReserve: (book: Book, member: { id: string; name: string; kind: MemberKind }) => void;
}) {
  const [barcode, setBarcode] = useState("");
  const [memberId, setMemberId] = useState("");
  const members = [
    ...props.students.filter((row) => !row.deletedAt && row.status === "active" && row.rollNo.trim()).map((row) => ({ id: row.id, name: row.name, kind: "student" as const })),
    ...props.staff.filter((row) => !row.deletedAt).map((row) => ({ id: row.id, name: row.name, kind: "faculty" as const })),
  ];
  const member = members.find((row) => row.id === memberId);
  function findCopy(code: string) {
    for (const book of props.books) {
      if (availableBarcodes(book, props.checkouts).includes(code) || openLoans(props.checkouts).some((row) => row.barcode === code)) return book;
    }
    return props.books.find((book) => book.id === code || book.isbn === code);
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel title="Issue">
        <Label>Member</Label>
        <select className="mt-1 h-11 w-full rounded-lg border border-[#e6e9ef] px-2 text-sm" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
          <option value="">Choose a member</option>
          {members.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.kind}</option>)}
        </select>
        <Label className="mt-2">Copy barcode</Label>
        <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Book id-copy, ISBN, or book id" />
        <Button className="mt-2" onClick={() => {
          const book = findCopy(barcode.trim());
          if (!book || !member) return toast.error("Choose a member and a copy.");
          const decision = canIssue({ rules: props.rules, book, checkouts: props.checkouts, memberId: member.id, today: props.today, kind: member.kind });
          if (!decision.ok) {
            if ("canOverride" in decision && decision.canOverride) props.onIssue(book, member, true);
            else toast.error(decision.error);
            return;
          }
          props.onIssue(book, member, false);
        }}>Confirm issue</Button>
      </Panel>
      <Panel title="Return">
        {openLoans(props.checkouts).map((row) => {
          const book = props.books.find((item) => item.id === row.bookId);
          const next = props.reservations.find((item) => item.bookId === row.bookId && item.status === "waiting");
          return (
            <div key={row.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>{row.barcode || book?.title} · due {row.dueOn}{isOverdue(row, props.today) ? ` · fine ₹${props.rules.fineAmount}` : ""}{next ? ` · reserved for ${next.memberName}` : ""}</span>
              <Button size="sm" variant="outline" onClick={() => props.onReturn(row)}>Return</Button>
            </div>
          );
        })}
      </Panel>
      <Panel title="Renew">
        {openLoans(props.checkouts).map((row) => {
          const kind: MemberKind = row.staffId ? "faculty" : "student";
          return (
            <div key={row.id} className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span>{props.books.find((book) => book.id === row.bookId)?.title} · renewals {row.renewals ?? 0}</span>
              <Button size="sm" variant="outline" onClick={() => props.onRenew(row, kind)}>Renew</Button>
            </div>
          );
        })}
      </Panel>
      <Panel title="Reserve">
        <p className="text-sm text-[#667085]">Place the chosen member in the queue for a title with no free copy.</p>
        <Button className="mt-2" variant="outline" onClick={() => {
          const book = findCopy(barcode.trim());
          if (!book || !member) return toast.error("Choose a member and a title.");
          props.onReserve(book, member);
        }}>Reserve</Button>
      </Panel>
    </div>
  );
}

function RulesEditor({ rules, canWrite, onSave }: { rules: LibraryRules; canWrite: boolean; onSave: (rules: LibraryRules) => void }) {
  const [draft, setDraft] = useState(rules);
  const number = (key: keyof LibraryRules) => (
    <label className="text-sm text-[#3e4657]">{key}
      <Input type="number" className="mt-1" value={Number(draft[key])} onChange={(event) => setDraft({ ...draft, [key]: Number(event.target.value) })} />
    </label>
  );
  return (
    <form className="grid gap-3 rounded-lg border border-[#e6e9ef] bg-white p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <h1 className="text-xl font-semibold text-[#1f2533] sm:col-span-2">Library rules</h1>
      {number("studentLimit")}
      {number("facultyLimit")}
      {number("studentDays")}
      {number("facultyDays")}
      {number("maxRenewals")}
      {number("fineAmount")}
      {(["allowReserve", "referenceLeaves", "blockIfOverdue", "recordOverride"] as const).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} />
          {key}
        </label>
      ))}
      {canWrite ? <Button type="submit" className="sm:col-span-2">Save rules</Button> : null}
    </form>
  );
}

function Reports({ books, checkouts, today, rules, reservations }: { books: Book[]; checkouts: Checkout[]; today: string; rules: LibraryRules; reservations: Reservation[] }) {
  const overdue = openLoans(checkouts).filter((row) => isOverdue(row, today));
  function backup() {
    const blob = new Blob([JSON.stringify({ books, checkouts, rules, reservations }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "library-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1f2533]">Reports</h1>
        <Button variant="outline" onClick={backup}>Back up data</Button>
      </div>
      <div className="rounded-lg border border-[#e6e9ef] bg-white p-3 text-sm">
        {books.map((book) => <p key={book.id}>{book.title}: {book.copies} copies, {availableBarcodes(book, checkouts).length} free, {openLoans(checkouts).filter((row) => row.bookId === book.id).length} on loan</p>)}
      </div>
      <div className="rounded-lg border border-[#e6e9ef] bg-white p-3 text-sm">
        <p className="font-semibold">Overdue</p>
        {overdue.length === 0 ? <p>None.</p> : overdue.map((row) => <p key={row.id}>{row.barcode || row.bookId} · due {row.dueOn} · fine ₹{rules.fineAmount}</p>)}
      </div>
    </div>
  );
}

function Recommend() {
  const [note, setNote] = useState("");
  return (
    <form className="rounded-lg border border-[#e6e9ef] bg-white p-4" onSubmit={(event) => { event.preventDefault(); const prev = JSON.parse(localStorage.getItem("gp-library-recommendations") || "[]"); localStorage.setItem("gp-library-recommendations", JSON.stringify([...prev, note])); setNote(""); toast.success("Recommendation sent to the library."); }}>
      <h2 className="font-semibold text-[#1f2533]">Recommend a book</h2>
      <Input className="mt-2" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Title and why the college needs it" />
      <Button className="mt-2" type="submit">Send recommendation</Button>
    </form>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-[#e6e9ef] bg-white p-4"><h2 className="font-semibold text-[#1f2533]">{title}</h2>{children}</section>;
}
