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
  status: "waiting" | "ready";
};

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
}) {
  const { rules, book, checkouts, memberId, today, kind, override } = input;
  const restricted = book.resourceType === "Reference" || book.resourceType === "Rare";
  if (restricted && !rules.referenceLeaves) {
    return { ok: false as const, error: "Reference and rare items stay in the library." };
  }
  if (availableBarcodes(book, checkouts).length === 0) {
    return { ok: false as const, error: "No copy is free. Reserve it instead." };
  }
  const mine = memberLoans(checkouts, memberId);
  if (rules.blockIfOverdue && mine.some((row) => isOverdue(row, today))) {
    if (!override) return { ok: false as const, error: "This member has an overdue item.", canOverride: true };
  }
  const limit = kind === "faculty" ? rules.facultyLimit : rules.studentLimit;
  if (mine.length >= limit) {
    return { ok: false as const, error: `This member already has ${limit} books out.` };
  }
  return { ok: true as const, dueOn: addDays(today, loanDays(rules, kind)), barcode: availableBarcodes(book, checkouts)[0] };
}

export function canRenew(rules: LibraryRules, loan: Checkout, today: string, kind: MemberKind) {
  if ((loan.renewals ?? 0) >= rules.maxRenewals) return { ok: false as const, error: "This loan has no renewals left." };
  if (isOverdue(loan, today)) return { ok: false as const, error: "An overdue loan cannot be renewed." };
  return { ok: true as const, dueOn: addDays(loan.dueOn, loanDays(rules, kind)) };
}
