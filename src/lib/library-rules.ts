import type { Book, Checkout } from "./types";

export type MemberKind = "student" | "faculty";

export type LibraryRules = {
  studentLimit: number;
  facultyLimit: number;
  studentDays: number;
  facultyDays: number;
  maxRenewals: number;
  allowReserve: boolean;
  fineAmount: number;
  referenceLeaves: boolean;
  blockIfOverdue: boolean;
  recordOverride: boolean;
};

export type Reservation = {
  id: string;
  bookId: string;
  memberId: string;
  memberName: string;
  memberKind: MemberKind;
  at: string;
  queue?: number;
  status: "waiting" | "ready" | "fulfilled" | "cancelled" | "expired";
  pickupBy?: string;
};

export type CopyStatus = "available" | "on loan" | "reserved" | "lost" | "damaged" | "reference-only" | "withdrawn";

export type LibraryCopy = {
  id: string;
  barcode: string;
  bookId: string;
  shelf: string;
  status: CopyStatus;
  purchaseDate: string;
  price: number;
  notes: string;
};

export type Activity = { id: string; at: string; actor: string; action: string };

export const DEFAULT_LIBRARY_RULES: LibraryRules = {
  studentLimit: 3,
  facultyLimit: 5,
  studentDays: 14,
  facultyDays: 30,
  maxRenewals: 1,
  allowReserve: true,
  fineAmount: 20,
  referenceLeaves: false,
  blockIfOverdue: true,
  recordOverride: true,
};

const RULES_KEY = "gp-library-rules";
const RESERVATION_KEY = "gp-library-reservations";
const COPIES_KEY = "gp-library-copies";
const ACTIVITY_KEY = "gp-library-activity";

export function loadLibraryRules(): LibraryRules {
  if (typeof window === "undefined") return DEFAULT_LIBRARY_RULES;
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? { ...DEFAULT_LIBRARY_RULES, ...JSON.parse(raw) } : DEFAULT_LIBRARY_RULES;
  } catch {
    return DEFAULT_LIBRARY_RULES;
  }
}

export function saveLibraryRules(rules: LibraryRules) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadReservations(): Reservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESERVATION_KEY);
    return raw ? (JSON.parse(raw) as Reservation[]) : [];
  } catch {
    return [];
  }
}

export function saveReservations(rows: Reservation[]) {
  localStorage.setItem(RESERVATION_KEY, JSON.stringify(rows));
}

export function loadCopies(): LibraryCopy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COPIES_KEY);
    return raw ? (JSON.parse(raw) as LibraryCopy[]) : [];
  } catch {
    return [];
  }
}

export function saveCopies(rows: LibraryCopy[]) {
  localStorage.setItem(COPIES_KEY, JSON.stringify(rows));
}

export function recordActivity(actor: string, action: string) {
  if (typeof window === "undefined") return;
  const prev = loadActivity();
  const next = [{ id: `${Date.now()}`, at: new Date().toISOString(), actor, action }, ...prev].slice(0, 200);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
}

export function loadActivity(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]") as Activity[];
  } catch {
    return [];
  }
}

export function restrictedTitle(book: Book) {
  return book.resourceType === "Reference" || book.resourceType === "Rare" || book.resourceType === "Pharmacopoeia";
}

export function ensureCopies(books: Book[], copies: LibraryCopy[]) {
  const next = [...copies];
  const seen = new Set(copies.map((copy) => copy.barcode));
  for (const book of books) {
    const mine = next.filter((copy) => copy.bookId === book.id);
    for (let index = mine.length; index < book.copies; index += 1) {
      const barcode = `${book.id}-${index + 1}`;
      if (seen.has(barcode)) continue;
      next.push({
        id: barcode,
        barcode,
        bookId: book.id,
        shelf: book.shelf || book.subject || "",
        status: restrictedTitle(book) ? "reference-only" : "available",
        purchaseDate: "",
        price: 0,
        notes: "",
      });
      seen.add(barcode);
    }
  }
  return next;
}

export function findDuplicate(books: Book[], draft: { id?: string; isbn?: string; title?: string; edition?: string }) {
  const title = draft.title?.trim().toLowerCase();
  return books.find((book) => {
    if (draft.id && book.id === draft.id) return false;
    if (draft.isbn && book.isbn && book.isbn === draft.isbn) return true;
    return Boolean(title) && book.title.toLowerCase() === title && (book.edition || "") === (draft.edition || "");
  });
}

export function barcodeTaken(copies: LibraryCopy[], barcode: string, ignoreId?: string) {
  return copies.some((copy) => copy.barcode === barcode && copy.id !== ignoreId);
}

export function queueReservations(rows: Reservation[]) {
  const waiting = rows.filter((row) => row.status === "waiting").sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return rows.map((row) => (row.status === "waiting" ? { ...row, queue: waiting.findIndex((item) => item.id === row.id) + 1 } : row));
}

export function returnCopy(copies: LibraryCopy[], reservations: Reservation[], barcode: string, today: string) {
  const copy = copies.find((item) => item.barcode === barcode);
  if (!copy) return { copies, reservations, heldFor: "" };
  const next = queueReservations(reservations).filter((row) => row.bookId === copy.bookId && row.status === "waiting").sort((a, b) => (a.queue ?? 0) - (b.queue ?? 0))[0];
  const updatedCopies = copies.map((item) => item.barcode === barcode ? { ...item, status: (next ? "reserved" : "available") as CopyStatus } : item);
  const updated = reservations.map((row) => row.id === next?.id ? { ...row, status: "ready" as const, pickupBy: addDays(today, 2) } : row);
  return { copies: updatedCopies, reservations: queueReservations(updated), heldFor: next?.memberName ?? "" };
}

export function openLoans(checkouts: Checkout[]) {
  return checkouts.filter((row) => !row.returnedOn);
}

export function memberLoans(checkouts: Checkout[], memberId: string) {
  return openLoans(checkouts).filter((row) => row.studentId === memberId || row.staffId === memberId);
}

export function copyBarcodes(book: Book) {
  return Array.from({ length: Math.max(0, book.copies) }, (_, index) => `${book.id}-${index + 1}`);
}

export function availableBarcodes(book: Book, checkouts: Checkout[]) {
  const out = openLoans(checkouts).filter((row) => row.bookId === book.id);
  const taken = new Set(out.map((row) => row.barcode).filter(Boolean));
  const unlabeled = out.filter((row) => !row.barcode).length;
  return copyBarcodes(book).filter((code) => !taken.has(code)).slice(unlabeled);
}

export function loanDays(rules: LibraryRules, kind: MemberKind) {
  return kind === "faculty" ? rules.facultyDays : rules.studentDays;
}

export function addDays(from: string, days: number) {
  const date = new Date(`${from}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isOverdue(row: Checkout, today: string) {
  return !row.returnedOn && row.dueOn < today;
}

export function canIssue(input: {
  rules: LibraryRules;
  book: Book;
  checkouts: Checkout[];
  memberId: string;
  today: string;
  kind: MemberKind;
  override?: boolean;
  copies?: LibraryCopy[];
  barcode?: string;
}) {
  const { rules, book, checkouts, memberId, today, kind, override } = input;
  const restricted = restrictedTitle(book);
  if (restricted && !rules.referenceLeaves) {
    return { ok: false as const, error: "Reference and rare items stay in the library." };
  }
  let barcode = input.barcode;
  if (barcode) {
    if (openLoans(checkouts).some((row) => row.barcode === barcode)) {
      return { ok: false as const, error: "That copy already has an open loan." };
    }
    const copy = input.copies?.find((item) => item.barcode === barcode);
    if (input.copies && (!copy || copy.bookId !== book.id || copy.status !== "available")) {
      return { ok: false as const, error: "That copy is not available to lend." };
    }
  } else {
    barcode = input.copies?.find((copy) => copy.bookId === book.id && copy.status === "available")?.barcode ?? availableBarcodes(book, checkouts)[0];
    if (!barcode) return { ok: false as const, error: "No copy is free. Reserve it instead." };
  }
  const mine = memberLoans(checkouts, memberId);
  if (rules.blockIfOverdue && mine.some((row) => isOverdue(row, today))) {
    if (!override) return { ok: false as const, error: "This member has an overdue item.", canOverride: true };
  }
  const limit = kind === "faculty" ? rules.facultyLimit : rules.studentLimit;
  if (mine.length >= limit) {
    return { ok: false as const, error: `This member already has ${limit} books out.` };
  }
  return { ok: true as const, dueOn: addDays(today, loanDays(rules, kind)), barcode };
}

export function canRenew(rules: LibraryRules, loan: Checkout, today: string, kind: MemberKind, reservations: Reservation[] = []) {
  if (reservations.some((row) => row.bookId === loan.bookId && row.status === "waiting")) {
    return { ok: false as const, error: "Another member is waiting for this title." };
  }
  if ((loan.renewals ?? 0) >= rules.maxRenewals) return { ok: false as const, error: "This loan has no renewals left." };
  if (isOverdue(loan, today)) return { ok: false as const, error: "An overdue loan cannot be renewed." };
  return { ok: true as const, dueOn: addDays(loan.dueOn, loanDays(rules, kind)) };
}

export function previewRows(existingIds: string[], rows: { collegeId: string; name: string }[]) {
  return rows.map((row) => ({ ...row, action: existingIds.includes(row.collegeId) ? "update" as const : "add" as const }));
}

export function readBackup(text: string) {
  try {
    const data = JSON.parse(text) as { books?: Book[]; copies?: LibraryCopy[]; checkouts?: Checkout[]; rules?: Partial<LibraryRules>; reservations?: Reservation[] };
    if (!Array.isArray(data.books)) return { ok: false as const, error: "The backup has no book list." };
    return {
      ok: true as const,
      books: data.books,
      copies: data.copies ?? [],
      checkouts: data.checkouts ?? [],
      rules: { ...DEFAULT_LIBRARY_RULES, ...data.rules },
      reservations: data.reservations ?? [],
    };
  } catch {
    return { ok: false as const, error: "That file is not a library backup." };
  }
}
