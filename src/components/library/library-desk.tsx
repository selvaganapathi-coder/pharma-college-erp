"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookMarked, BookPlus, Package, RotateCcw, Search, UserPlus } from "lucide-react";
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
  ensureCopies,
  findDuplicate,
  isOverdue,
  loadCopies,
  loadActivity,
  loadLibraryRules,
  loadReservations,
  memberLoans,
  openLoans,
  previewRows,
  queueReservations,
  readBackup,
  recordActivity,
  returnCopy,
  saveCopies,
  saveLibraryRules,
  saveReservations,
  type LibraryRules,
  type MemberKind,
  type LibraryCopy,
  type Reservation,
} from "@/lib/library-rules";
import type { Book, Checkout } from "@/lib/types";
import { toast } from "sonner";

type View = "dashboard" | "catalog" | "book" | "members" | "circulation" | "rules" | "reports" | "guide";

export function LibraryDesk({ mode = "desk", view: fixedView, onNavigate }: { mode?: "desk" | "student" | "faculty"; view?: View; onNavigate?: (view: View) => void }) {
  const { state, save, allowed, user } = useApp();
  const [view, setView] = useState<View>(fixedView ?? (mode === "desk" ? "dashboard" : "catalog"));
  const shown = fixedView ?? view;
  function openView(next: View) {
    if (onNavigate) {
      onNavigate(next);
      return;
    }
    setView(next);
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rules, setRules] = useState<LibraryRules>(() => loadLibraryRules());
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = loadReservations();
    if (saved.length) return saved;
    const sample: Reservation = {
      id: "sample-ready",
      bookId: "sample-book-01",
      memberId: "preview-student",
      memberName: "Aarav Kumar",
      memberKind: "student",
      at: new Date().toISOString().slice(0, 10),
      status: "ready",
      pickupBy: new Date().toISOString().slice(0, 10),
      queue: 1,
    };
    saveReservations([sample]);
    return [sample];
  });
  const [copies, setCopies] = useState<LibraryCopy[]>([]);
  const copyKey = state.books.map((book) => `${book.id}:${book.copies}:${book.resourceType ?? ""}`).join("|");
  useEffect(() => {
    const live = state.books.filter((book) => !book.deletedAt);
    setCopies((current) => {
      const next = ensureCopies(live, current.length ? current : loadCopies());
      saveCopies(next);
      return next;
    });
  }, [copyKey, state.books]);
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState("All");
  const [onlyFree, setOnlyFree] = useState(false);
  const [letter, setLetter] = useState("All");
  const [sort, setSort] = useState<"az" | "za" | "author">("az");
  const [showAdd, setShowAdd] = useState(false);
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
      if (letter !== "All" && !book.title.toUpperCase().startsWith(letter)) return false;
      return true;
    }).sort((a, b) => {
      const left = sort === "author" ? a.author : a.title;
      const right = sort === "author" ? b.author : b.title;
      return sort === "za" ? right.localeCompare(left) : left.localeCompare(right);
    });
  }, [books, query, resource, onlyFree, letter, sort, state.checkouts]);

  const selected = books.find((book) => book.id === selectedId) ?? null;

  async function issue(book: Book, member: { id: string; name: string; kind: MemberKind }, override = false, barcode?: string) {
    const scanned = barcode && copies.some((copy) => copy.barcode === barcode) ? barcode : undefined;
    const decision = canIssue({ rules, book, checkouts: state.checkouts, memberId: member.id, today, kind: member.kind, override, copies, barcode: scanned });
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
      processedBy: user?.name ?? "Librarian",
    };
    const result = await save("checkouts", row, `Issued ${book.title} to ${member.name}.`);
    if (!result.ok) return;
    setCopies((current) => {
      const next = current.map((copy) => copy.barcode === decision.barcode ? { ...copy, status: "on loan" as const } : copy);
      saveCopies(next);
      return next;
    });
    recordActivity(user?.name ?? "Librarian", `Issued copy ${decision.barcode} to ${member.name}.`);
    if (override && rules.recordOverride) toast.success("Issued. The overdue override was recorded.");
    else toast.success(`Issued until ${decision.dueOn}.`);
  }

  async function giveBack(row: Checkout) {
    const late = isOverdue(row, today);
    const fine = late ? rules.fineAmount : 0;
    const result = await save("checkouts", { ...row, returnedOn: today, fine, processedBy: user?.name ?? "Librarian" }, "Returned a library copy.");
    if (!result.ok) return;
    const moved = returnCopy(copies, reservations, row.barcode || "", today);
    setCopies(moved.copies);
    saveCopies(moved.copies);
    remember(moved.reservations);
    recordActivity(user?.name ?? "Librarian", `Returned copy ${row.barcode || row.id}.`);
    toast.success(late ? `Returned. Fine ₹${fine}.` : moved.heldFor ? `Returned. Ready for ${moved.heldFor}.` : "Returned.");
  }

  async function renew(row: Checkout, kind: MemberKind) {
    const decision = canRenew(rules, row, today, kind, reservations);
    if (!decision.ok) {
      toast.error(decision.error);
      return;
    }
    const result = await save("checkouts", { ...row, dueOn: decision.dueOn, renewals: (row.renewals ?? 0) + 1, processedBy: user?.name ?? "Librarian" }, "Renewed a library loan.");
    if (result.ok) {
      recordActivity(user?.name ?? "Librarian", `Renewed copy ${row.barcode || row.id}.`);
      toast.success(`New due date ${decision.dueOn}.`);
    }
  }

  function reserve(book: Book, member: { id: string; name: string; kind: MemberKind }) {
    if (!rules.allowReserve) {
      toast.error("Reservations are turned off.");
      return;
    }
    const queued = queueReservations([...reservations, { id: uid("rsv"), bookId: book.id, memberId: member.id, memberName: member.name, memberKind: member.kind, at: today, status: "waiting" }]);
    remember(queued);
    const mine = queued.find((item) => item.memberId === member.id && item.bookId === book.id && item.status === "waiting");
    toast.success(`Reservation placed. Queue position ${mine?.queue ?? 1}.`);
  }

  function collect(reservation: Reservation) {
    remember(reservations.map((row) => (row.id === reservation.id ? { ...row, status: "fulfilled" } : row)));
    setCopies((current) => {
      const held = current.find((copy) => copy.bookId === reservation.bookId && copy.status === "reserved");
      if (!held) return current;
      const next = current.map((copy) => (copy.id === held.id ? { ...copy, status: "available" as const } : copy));
      saveCopies(next);
      return next;
    });
    recordActivity(user?.name ?? "Librarian", `Marked ${reservation.memberName}'s pickup collected.`);
    toast.success("Marked collected.");
  }

  async function restore(payload: { books: Book[]; copies: LibraryCopy[]; checkouts: Checkout[]; rules: LibraryRules; reservations: Reservation[] }) {
    setRules(payload.rules);
    saveLibraryRules(payload.rules);
    setCopies(payload.copies);
    saveCopies(payload.copies);
    remember(payload.reservations);
    for (const book of payload.books) await save("books", book, `Restored ${book.title}.`);
    for (const loan of payload.checkouts) await save("checkouts", loan, "Restored a loan.");
    recordActivity(user?.name ?? "Librarian", "Restored a library backup.");
    toast.success("Backup restored.");
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

  const sections: View[] = ["dashboard", "catalog", "members", "circulation", "rules", "reports", "guide"];
  return (
    <div className="space-y-4">
      {mode === "desk" && !onNavigate ? (
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((item) => (
            <button key={item} type="button" onClick={() => openView(item)} className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium capitalize ${shown === item ? "bg-[#e7f0ff] text-[#1b6de0]" : "bg-white text-[#3e4657]"}`}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {shown === "dashboard" ? (
        <Dashboard
          books={books}
          checkouts={state.checkouts}
          reservations={reservations}
          students={state.students}
          staff={state.staff}
          today={today}
          name={user?.name ?? "Librarian"}
          onJump={openView}
          onSearch={(text) => {
            setQuery(text);
            openView("catalog");
          }}
          onCollect={collect}
        />
      ) : null}
      {shown === "catalog" || shown === "book" ? (
        <div className="space-y-4">
          <CatalogFinder
            books={books}
            checkouts={state.checkouts}
            students={state.students}
            query={query}
            setQuery={setQuery}
            resource={resource}
            setResource={setResource}
            onlyFree={onlyFree}
            setOnlyFree={setOnlyFree}
            letter={letter}
            setLetter={setLetter}
            sort={sort}
            setSort={setSort}
            canWrite={canWrite}
            showAdd={showAdd}
            setShowAdd={setShowAdd}
            onRemove={(book) => void save("books", { ...book, deletedAt: new Date().toISOString() }, `Removed ${book.title}.`)}
            rows={results}
            onOpen={setSelectedId}
          />
          {canWrite && showAdd ? <AddBook books={books} onSave={(book) => { void save("books", book, `Saved book ${book.title}.`); setShowAdd(false); }} /> : null}
          {selected ? (
            <BookDetail
              book={selected}
              copies={copies.filter((copy) => copy.bookId === selected.id)}
              checkouts={state.checkouts}
              canEdit={canWrite}
              onIssue={() => openView("circulation")}
              onReserve={() => openView("circulation")}
              onUpdateCopy={(copy) => {
                if (copies.some((item) => item.barcode === copy.barcode && item.id !== copy.id)) {
                  toast.error("That barcode is already used.");
                  return;
                }
                setCopies((current) => {
                  const next = current.map((item) => (item.id === copy.id ? copy : item));
                  saveCopies(next);
                  return next;
                });
                recordActivity(user?.name ?? "Librarian", `Updated copy ${copy.barcode}.`);
                toast.success("Copy updated.");
              }}
            />
          ) : null}
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
          onIssue={(book, member, override, barcode) => void issue(book, member, override, barcode)}
          onReturn={(row) => void giveBack(row)}
          onRenew={(row, kind) => void renew(row, kind)}
          onReserve={(book, member) => reserve(book, member)}
        />
      ) : null}
      {shown === "rules" ? <RulesEditor rules={rules} canWrite={canWrite} onSave={(next) => { setRules(next); saveLibraryRules(next); toast.success("Library rules saved."); }} /> : null}
      {shown === "reports" ? <Reports books={books} checkouts={state.checkouts} today={today} rules={rules} reservations={reservations} onRestore={(payload) => void restore(payload)} /> : null}
      {shown === "guide" ? <LaunchGuide /> : null}
    </div>
  );
}

function Dashboard({
  books,
  checkouts,
  reservations,
  students,
  staff,
  today,
  name,
  onJump,
  onSearch,
  onCollect,
}: {
  books: Book[];
  checkouts: Checkout[];
  reservations: Reservation[];
  students: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  today: string;
  name: string;
  onJump: (view: View) => void;
  onSearch: (text: string) => void;
  onCollect: (reservation: Reservation) => void;
}) {
  const loans = openLoans(checkouts);
  const available = books.reduce((sum, book) => sum + availableBarcodes(book, checkouts).length, 0);
  const overdue = loans.filter((row) => isOverdue(row, today));
  const pickups = reservations.filter((row) => row.status === "ready");
  const [find, setFind] = useState("");
  function person(id: string) {
    return students.find((row) => row.id === id)?.name ?? staff.find((row) => row.id === id)?.name ?? "Member";
  }
  function lateDays(due: string) {
    const ms = new Date(`${today}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime();
    return Math.max(1, Math.round(ms / 86400000));
  }
  const kinds = ["Textbook", "Reference", "Journal", "Pharmacopoeia", "E-book"] as const;
  const byType = kinds.map((kind) => ({ kind, count: books.filter((book) => (book.resourceType ?? "Textbook") === kind).length }));
  const barColors = ["#0f3d68", "#1b6de0", "#0e8a6a", "#b54708", "#7a3e9d"];
  const activity = [
    ...loadActivity(),
    ...checkouts.slice(0, 8).map((row) => ({
      id: row.id,
      at: row.returnedOn ?? row.issuedOn,
      actor: row.processedBy || name,
      action: `${row.returnedOn ? "Returned" : "Issued"} ${books.find((book) => book.id === row.bookId)?.title ?? "a book"}`,
    })),
  ].slice(0, 6);
  const cards: { label: string; value: number; view: View; hint: string; icon: typeof Package; wash: string; ink: string }[] = [
    { label: "Available", value: available, view: "catalog", hint: "Copies on the shelf", icon: Package, wash: "bg-[#e8f7ee]", ink: "text-[#067647]" },
    { label: "On loan", value: loans.length, view: "circulation", hint: "Copies with members", icon: BookMarked, wash: "bg-[#e7f0ff]", ink: "text-[#0f3d68]" },
    { label: "Overdue", value: overdue.length, view: "reports", hint: "Ask for these back", icon: AlertCircle, wash: "bg-[#fdecec]", ink: "text-[#d92d20]" },
    { label: "Pickup needed", value: pickups.length, view: "circulation", hint: "Ready for a member", icon: BookPlus, wash: "bg-[#fff6e8]", ink: "text-[#b54708]" },
  ];
  const actions: { label: string; note: string; view: View; icon: typeof Package; primary?: boolean }[] = [
    { label: "Issue a book", note: "Scan a barcode", view: "circulation", icon: BookMarked, primary: true },
    { label: "Return a book", note: "Close a loan", view: "circulation", icon: RotateCcw },
    { label: "Add a book", note: "New title", view: "catalog", icon: BookPlus },
    { label: "Register a member", note: "Student or faculty", view: "members", icon: UserPlus },
  ];
  return (
    <div className="space-y-5">
      <form className="overflow-hidden rounded-3xl bg-[#0f3d68] p-5 text-white shadow-[0_12px_30px_-18px_rgba(15,61,104,0.8)]" onSubmit={(event) => { event.preventDefault(); onSearch(find.trim()); }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#b9d4f5] uppercase">College Library</p>
            <h1 className="mt-1 text-2xl font-semibold">Hello, {name.split(" ")[0]}</h1>
          </div>
          <p className="rounded-full bg-white/10 px-3 py-1 text-sm">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8b93a7]" />
          <Input className="h-12 rounded-2xl border-0 bg-white pl-11 text-[#1f2533]" value={find} onChange={(event) => setFind(event.target.value)} placeholder="Search books, members, or barcodes" />
        </div>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" onClick={() => onJump(card.view)} className="flex items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-[0_8px_24px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[#e6e9ef] transition hover:-translate-y-0.5">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${card.wash} ${card.ink}`}><Icon className="size-5" /></span>
              <span>
                <span className={`block text-3xl font-semibold leading-none ${card.ink}`}>{card.value}</span>
                <span className="mt-1 block text-sm font-medium text-[#1f2533]">{card.label}</span>
                <span className="block text-xs text-[#8b93a7]">{card.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[#e6e9ef]">
          <h2 className="font-semibold text-[#1f2533]">What you can do now</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} type="button" onClick={() => onJump(action.view)} className={`flex min-h-24 flex-col justify-between rounded-2xl p-3 text-left ${action.primary ? "bg-[#0f3d68] text-white" : "bg-[#f4f7fb] text-[#0f3d68]"}`}>
                  <Icon className="size-5" />
                  <span>
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className={`block text-xs ${action.primary ? "text-[#d5e4f5]" : "text-[#667085]"}`}>{action.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[#e6e9ef]">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="font-semibold text-[#1f2533]">Today’s attention</h2>
              <p className="text-xs text-[#8b93a7]">Late returns first, then pickups</p>
            </div>
            <span className="rounded-full bg-[#fdecec] px-2.5 py-1 text-xs font-semibold text-[#d92d20]">{overdue.length + pickups.length}</span>
          </div>
          {overdue.length + pickups.length === 0 ? <p className="px-4 pb-4 text-sm text-[#667085]">Nothing needs action today.</p> : (
            <ul>
              {overdue.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 border-t border-[#f0f3f8] px-4 py-3">
                  <span className="h-10 w-1 rounded-full bg-[#d92d20]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#1f2533]">{books.find((book) => book.id === row.bookId)?.title ?? "Book"}</span>
                    <span className="text-xs text-[#667085]">{person(row.studentId || row.staffId || "")} · Overdue by {lateDays(row.dueOn)} days</span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => onJump("circulation")}>View loan</Button>
                </li>
              ))}
              {pickups.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 border-t border-[#f0f3f8] px-4 py-3">
                  <span className="h-10 w-1 rounded-full bg-[#b54708]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#1f2533]">{books.find((book) => book.id === row.bookId)?.title ?? "Book"}</span>
                    <span className="text-xs text-[#667085]">{row.memberName} · Ready for pickup</span>
                  </span>
                  <Button size="sm" onClick={() => onCollect(row)}>Mark collected</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[#e6e9ef]">
          <h2 className="font-semibold text-[#1f2533]">How the collection is used</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#eef1f6]">
            {byType.map((row, index) => (
              <div key={row.kind} style={{ width: `${(row.count / Math.max(1, books.length)) * 100}%`, background: barColors[index] }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {byType.map((row, index) => (
              <li key={row.kind} className="flex items-center justify-between rounded-xl bg-[#f7f9fc] px-3 py-2">
                <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: barColors[index] }} />{row.kind === "Reference" ? "Reference" : row.kind}</span>
                <span className="font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_-18px_rgba(16,24,40,0.45)] ring-1 ring-[#e6e9ef]">
          <h2 className="font-semibold text-[#1f2533]">Recent activity</h2>
          {activity.length === 0 ? <p className="mt-3 text-sm text-[#667085]">No issues or returns yet.</p> : (
            <ul className="mt-3 space-y-3 text-sm">
              {activity.map((row) => (
                <li key={row.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#e7f0ff] text-xs font-bold text-[#0f3d68]">{row.actor.slice(0, 1)}</span>
                  <div>
                    <p className="font-medium text-[#1f2533]">{row.action}</p>
                    <p className="text-xs text-[#8b93a7]">{row.actor} · {row.at.slice(0, 16).replace("T", " ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CatalogFinder(props: {
  books: Book[];
  checkouts: Checkout[];
  students: { id: string; name: string; rollNo: string }[];
  query: string;
  setQuery: (value: string) => void;
  resource: string;
  setResource: (value: string) => void;
  onlyFree: boolean;
  setOnlyFree: (value: boolean) => void;
  letter: string;
  setLetter: (value: string) => void;
  sort: "az" | "za" | "author";
  setSort: (value: "az" | "za" | "author") => void;
  canWrite: boolean;
  showAdd: boolean;
  setShowAdd: (value: boolean) => void;
  onRemove: (book: Book) => void;
  rows: Book[];
  onOpen: (id: string) => void;
}) {
  const total = props.books.length;
  const out = openLoans(props.checkouts).length;
  const inside = props.books.reduce((sum, book) => sum + book.copies, 0) - out;
  const letters = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total books", total],
          ["In library", inside],
          ["Out with students", out],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9ef]">
            <p className="text-xs font-semibold tracking-wide text-[#8b93a7] uppercase">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-[#0f3d68]">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="min-w-56 flex-1" value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search title, author, ISBN, or barcode" />
        <select className="h-11 rounded-lg border border-[#e6e9ef] bg-white px-2 text-sm" value={props.sort} onChange={(event) => props.setSort(event.target.value as "az" | "za" | "author")}>
          <option value="az">A to Z</option>
          <option value="za">Z to A</option>
          <option value="author">Author</option>
        </select>
        <select className="h-11 rounded-lg border border-[#e6e9ef] bg-white px-2 text-sm" value={props.resource} onChange={(event) => props.setResource(event.target.value)}>
          {["All", "Textbook", "Reference", "Journal", "E-book", "Pharmacopoeia", "Other"].map((item) => <option key={item}>{item}</option>)}
        </select>
        {props.canWrite ? <Button type="button" onClick={() => props.setShowAdd(!props.showAdd)}>{props.showAdd ? "Close form" : "Add book"}</Button> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {letters.map((item) => (
          <button key={item} type="button" onClick={() => props.setLetter(item)} className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold ${props.letter === item ? "bg-[#0f3d68] text-white" : "bg-white text-[#3e4657] ring-1 ring-[#e6e9ef]"}`}>{item}</button>
        ))}
      </div>
      <div className="space-y-3">
        {props.rows.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-[#667085]">No books match.</p> : props.rows.map((book) => {
          const loans = openLoans(props.checkouts).filter((row) => row.bookId === book.id);
          const free = Math.max(0, book.copies - loans.length);
          return (
            <article key={book.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#e6e9ef]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" className="text-left" onClick={() => props.onOpen(book.id)}>
                  <p className="text-base font-semibold text-[#0f3d68]">{book.title}</p>
                  <p className="text-sm text-[#667085]">{book.author} · {book.subject} · {book.resourceType ?? "Book"}</p>
                </button>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[#e8f7ee] px-2 py-1 text-[#067647]">In {free}</span>
                  <span className="rounded-full bg-[#e7f0ff] px-2 py-1 text-[#0f3d68]">Out {loans.length}</span>
                  {props.canWrite ? <Button size="sm" variant="outline" onClick={() => props.onRemove(book)}>Remove</Button> : null}
                </div>
              </div>
              <p className="mt-2 text-sm text-[#1f2533]">Row {book.row || "—"} · Rack {book.rack || book.shelf || "—"}</p>
              {loans.length === 0 ? <p className="mt-1 text-xs text-[#8b93a7]">No student has this book out.</p> : (
                <ul className="mt-2 space-y-1 text-xs text-[#3e4657]">
                  {loans.map((loan) => {
                    const student = props.students.find((row) => row.id === loan.studentId);
                    return <li key={loan.id}>{student?.name ?? "Member"}{student?.rollNo ? ` · ${student.rollNo}` : ""} · out {loan.issuedOn} · due {loan.dueOn}</li>;
                  })}
                </ul>
              )}
            </article>
          );
        })}
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
        {["All", "Textbook", "Reference", "Journal", "E-book", "Pharmacopoeia", "Other"].map((item) => <option key={item}>{item}</option>)}
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
  copies = [],
  checkouts,
  canEdit,
  onIssue,
  onReserve,
  onUpdateCopy,
}: {
  book: Book;
  copies?: LibraryCopy[];
  checkouts: Checkout[];
  canEdit: boolean;
  onIssue: () => void;
  onReserve: () => void;
  onUpdateCopy?: (copy: LibraryCopy) => void;
}) {
  const free = copies.filter((copy) => copy.status === "available").length;
  const out = openLoans(checkouts).filter((row) => row.bookId === book.id);
  return (
    <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1f2533]">{book.title}</h2>
          <p className="text-sm text-[#667085]">{book.author} · {book.edition || "Edition not set"} · {book.year || "Year not set"} · ISBN {book.isbn || "—"}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onIssue}>{canEdit ? "Issue a copy" : "Borrow"}</Button>
          <Button variant="outline" onClick={onReserve}>Reserve</Button>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Subject<br /><strong>{book.subject || "—"}</strong></div>
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Type<br /><strong>{book.resourceType ?? "Book"}</strong></div>
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Shelf<br /><strong>{book.shelf || book.subject || "—"}</strong></div>
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Call number<br /><strong>{book.callNumber || "—"}</strong></div>
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Course<br /><strong>{book.course || "—"} {book.semester || ""}</strong></div>
        <div className="rounded-md bg-[#f5f6fa] px-3 py-2">Copies<br /><strong>{copies.length || book.copies} total · {free} free · {out.length} on loan</strong></div>
      </dl>
      {book.description ? <p className="mt-3 text-sm text-[#d92d20]">{book.description}</p> : null}
      {book.digitalLink ? <p className="mt-1 text-sm"><a className="text-[#1b6de0]" href={book.digitalLink}>Open licensed digital copy</a></p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[#8b93a7]">
            <tr><th className="py-2">Barcode</th><th>Shelf</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {copies.map((copy) => <CopyRow key={copy.id} copy={copy} canEdit={canEdit} onSave={onUpdateCopy} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CopyRow({ copy, canEdit, onSave }: { copy: LibraryCopy; canEdit: boolean; onSave?: (copy: LibraryCopy) => void }) {
  const [barcode, setBarcode] = useState(copy.barcode);
  const [shelf, setShelf] = useState(copy.shelf);
  const [status, setStatus] = useState(copy.status);
  return (
    <tr className="border-t border-[#eef1f6]">
      <td className="py-2 pr-2"><Input value={barcode} disabled={!canEdit} onChange={(event) => setBarcode(event.target.value)} /></td>
      <td className="py-2 pr-2"><Input value={shelf} disabled={!canEdit} onChange={(event) => setShelf(event.target.value)} /></td>
      <td className="py-2 pr-2">
        <select className="h-11 w-full rounded-lg border border-[#e6e9ef] px-2 text-sm" value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value as LibraryCopy["status"])}>
          {["available", "on loan", "reserved", "lost", "damaged", "reference-only", "withdrawn"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </td>
      <td className="py-2">{canEdit && onSave ? <Button type="button" size="sm" variant="outline" onClick={() => onSave({ ...copy, barcode, shelf, status })}>Save</Button> : null}</td>
    </tr>
  );
}

function AddBook({ books, onSave }: { books: Book[]; onSave: (book: Book) => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [edition, setEdition] = useState("");
  const [year, setYear] = useState("");
  const [subject, setSubject] = useState<string>(PHARMACY_SHELVES[0]);
  const [copies, setCopies] = useState(1);
  const [resourceType, setResourceType] = useState<Book["resourceType"]>("Textbook");
  const [course, setCourse] = useState("");
  const [link, setLink] = useState("");
  return (
    <form
      className="grid gap-2 rounded-lg border border-[#e6e9ef] bg-white p-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !author.trim() || !isbn.trim()) {
          toast.error("Title, author, and ISBN are required.");
          return;
        }
        const duplicate = findDuplicate(books, { isbn, title, edition });
        if (duplicate) {
          toast.error(`Possible duplicate of ${duplicate.title}. Check ISBN, title, and edition.`);
          return;
        }
        onSave({
          id: uid("b"),
          title: title.trim(),
          subtitle: "",
          author,
          isbn,
          subject,
          keywords: subject,
          copies,
          resourceType,
          shelf: subject,
          edition,
          year,
          publisher: "",
          callNumber: "",
          course,
          semester: "",
          description: resourceType === "Reference" || resourceType === "Pharmacopoeia" ? "Reference use only." : "",
          catalogedOn: new Date().toISOString().slice(0, 10),
          digitalLink: link,
        });
        setTitle("");
        setAuthor("");
        setIsbn("");
      }}
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" required />
      <Input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author or authors" required />
      <Input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="ISBN" required />
      <Input value={edition} onChange={(event) => setEdition(event.target.value)} placeholder="Edition" />
      <Input value={year} onChange={(event) => setYear(event.target.value)} placeholder="Publication year" />
      <Input value={course} onChange={(event) => setCourse(event.target.value)} placeholder="Course or semester" />
      <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={subject} onChange={(event) => setSubject(event.target.value)}>
        {[...PHARMACY_SHELVES, "Clinical Pharmacy"].map((shelf) => <option key={shelf}>{shelf}</option>)}
      </select>
      <select className="h-11 rounded-lg border border-[#e6e9ef] px-2 text-sm" value={resourceType} onChange={(event) => setResourceType(event.target.value as Book["resourceType"])}>
        {["Textbook", "Reference", "Journal", "E-book", "Pharmacopoeia", "Other"].map((item) => <option key={item}>{item}</option>)}
      </select>
      <Input type="number" min={1} value={copies} onChange={(event) => setCopies(Number(event.target.value))} />
      <Input className="sm:col-span-2" value={link} onChange={(event) => setLink(event.target.value)} placeholder="Licensed digital link, if the college subscribes" />
      <Button type="submit">Save title and copies</Button>
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
  const [search, setSearch] = useState("");
  const students = props.stateStudents.filter((row) => !row.deletedAt);
  const faculty = props.stateStaff.filter((row) => !row.deletedAt);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-[#1f2533]">Members</h1>
      <p className="text-sm text-[#667085]">The librarian registers members. Check a spreadsheet before adding or updating anyone. Passwords are never stored here.</p>
      <MemberImport existing={students.map((row) => row.rollNo).filter(Boolean)} />
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
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or college ID" />
      {[...students.map((row) => ({ id: row.id, name: row.name, code: row.rollNo, kind: "Student" as const, meta: `Year ${row.year}` })), ...faculty.map((row) => ({ id: row.id, name: row.name, code: row.staffCode, kind: "Faculty" as const, meta: "Faculty" }))].filter((member) => `${member.name} ${member.code}`.toLowerCase().includes(search.trim().toLowerCase())).map((member) => {
        const loans = memberLoans(props.checkouts, member.id);
        return (
          <article key={member.id} className="rounded-lg border border-[#e6e9ef] bg-white p-3 text-sm">
            <p className="font-semibold text-[#1f2533]">{member.name} · {member.code || "No college ID"}</p>
            <p className="text-[#667085]">{member.kind} · {member.meta} · {loans.length ? "Active" : "Clear"}</p>
            <p className="mt-1">Current loans: {loans.map((row) => row.dueOn).join(", ") || "none"}</p>
            <p>Reservations: {props.reservations.filter((row) => row.memberId === member.id).map((row) => `${row.status}${row.queue ? ` #${row.queue}` : ""}`).join(", ") || "none"}</p>
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
  onIssue: (book: Book, member: { id: string; name: string; kind: MemberKind }, override?: boolean, barcode?: string) => void;
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
  function confirmIssue() {
    const book = findCopy(barcode.trim());
    if (!book || !member) return toast.error("Choose a member and a copy.");
    const decision = canIssue({ rules: props.rules, book, checkouts: props.checkouts, memberId: member.id, today: props.today, kind: member.kind, barcode: barcode.trim() });
    if (!decision.ok) {
      if ("canOverride" in decision && decision.canOverride) props.onIssue(book, member, true, barcode.trim());
      else toast.error(decision.error);
      return;
    }
    props.onIssue(book, member, false, barcode.trim());
  }
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
        <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Scan or type the copy barcode" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); confirmIssue(); } }} />
        <Button className="mt-2" onClick={confirmIssue}>Confirm issue</Button>
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

function Reports({ books, checkouts, today, rules, reservations, onRestore }: { books: Book[]; checkouts: Checkout[]; today: string; rules: LibraryRules; reservations: Reservation[]; onRestore: (payload: { books: Book[]; copies: LibraryCopy[]; checkouts: Checkout[]; rules: LibraryRules; reservations: Reservation[] }) => void }) {
  const overdue = openLoans(checkouts).filter((row) => isOverdue(row, today));
  function backup() {
    const blob = new Blob([JSON.stringify({ books, copies: loadCopies(), checkouts, rules, reservations }, null, 2)], { type: "application/json" });
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={backup}>Export spreadsheet</Button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-[#e6e9ef] bg-white px-3 py-2 text-sm font-medium">
            Restore backup
            <input className="sr-only" type="file" accept="application/json" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void file.text().then((text) => {
                const parsed = readBackup(text);
                if (!parsed.ok) toast.error(parsed.error);
                else onRestore(parsed);
              });
            }} />
          </label>
        </div>
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

function MemberImport({ existing }: { existing: string[] }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ collegeId: string; name: string; action: "add" | "update" }[]>([]);
  return (
    <div className="rounded-lg border border-[#e6e9ef] bg-white p-3 text-sm">
      <p className="font-semibold text-[#1f2533]">Spreadsheet check</p>
      <p className="text-[#667085]">Paste college ID and name, one member per line, separated by a comma. Nothing is saved until you register them.</p>
      <textarea className="mt-2 min-h-20 w-full rounded-lg border border-[#e6e9ef] p-2" value={text} onChange={(event) => setText(event.target.value)} placeholder="2026-010, Ananya Rao" />
      <Button type="button" variant="outline" className="mt-2" onClick={() => {
        const rows = text.split("\n").map((line) => line.split(",")).filter((parts) => parts[0] && parts[1]).map((parts) => ({ collegeId: parts[0].trim(), name: parts[1].trim() }));
        setPreview(previewRows(existing, rows));
      }}>Preview import</Button>
      {preview.map((row) => <p key={row.collegeId}>{row.action}: {row.collegeId} · {row.name}</p>)}
    </div>
  );
}

function LaunchGuide() {
  return (
    <div className="space-y-4 text-sm text-[#3e4657]">
      <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
        <h1 className="text-xl font-semibold text-[#1f2533]">Technical setup</h1>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Front end: these Next.js pages for librarians, students, and faculty.</li>
          <li>Back end: sign-in, loan limits, due dates, and the reservation queue in this app.</li>
          <li>Database: titles and loans in the college cloud; copies, reservations, and the backup file for the desk.</li>
          <li>Hosting: the approved Vercel address. Confirm backups and access with college IT before launch.</li>
          <li>Barcode scanner: optional. It types into the copy field like a keyboard and presses Enter.</li>
        </ul>
      </section>
      <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
        <h2 className="text-lg font-semibold text-[#1f2533]">Build order</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Policies and roles are set under Rules.</li>
          <li>Screens are Dashboard, Catalog, Members, Circulation, Rules, and Reports.</li>
          <li>Records are titles, copies, members, loans, and reservations.</li>
          <li>Sign-in sends each role to its own pages.</li>
          <li>Catalog and copies, then members, then issue, return, and renewal.</li>
          <li>Search and the student view, then reservations and reports.</li>
          <li>Load a small sample, review it here, then import the full lists.</li>
          <li>Train with this page, launch, and note what the next update should change.</li>
        </ol>
      </section>
      <section className="rounded-lg border border-[#e6e9ef] bg-white p-4">
        <h2 className="text-lg font-semibold text-[#1f2533]">Ready when</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Catalog shows whether a copy is available.</li>
          <li>Issuing the same barcode twice is refused.</li>
          <li>Students get 14 days and faculty get 30, unless Rules says otherwise.</li>
          <li>A student sees only their own loans and due dates.</li>
          <li>A return offers the copy to the next reservation.</li>
          <li>Reports list inventory and overdue loans.</li>
          <li>Export spreadsheet can be loaded again with Restore backup.</li>
          <li>Students and faculty cannot change the catalogue. Librarians can.</li>
        </ul>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-[#e6e9ef] bg-white p-4"><h2 className="font-semibold text-[#1f2533]">{title}</h2>{children}</section>;
}
