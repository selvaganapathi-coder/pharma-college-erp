import { describe, expect, it } from "vitest";
import { availableBarcodes, canIssue, canRenew, DEFAULT_LIBRARY_RULES, findDuplicate, previewRows, readBackup, returnCopy, type LibraryCopy, type LibraryRules, type Reservation } from "@/lib/library-rules";
import { samplePharmacyBooks } from "@/lib/sample-catalog";
import type { Book, Checkout } from "@/lib/types";

const book = (over: Partial<Book> = {}): Book => ({
  id: "b1",
  isbn: "1",
  title: "Pharmacology",
  author: "Tripathi",
  copies: 1,
  resourceType: "Book",
  ...over,
});

const loan = (over: Partial<Checkout> = {}): Checkout => ({
  id: "c1",
  bookId: "b1",
  studentId: "s1",
  issuedOn: "2026-11-01",
  dueOn: "2026-11-15",
  ...over,
});

const rules: LibraryRules = { ...DEFAULT_LIBRARY_RULES, studentLimit: 1, studentDays: 14, maxRenewals: 1 };

describe("sample catalog", () => {
  it("loads 50 pharmacy titles with unique ISBNs", () => {
    const books = samplePharmacyBooks();
    expect(books).toHaveLength(50);
    expect(new Set(books.map((book) => book.isbn)).size).toBe(50);
    expect(books.some((book) => book.subject === "Pharmacology")).toBe(true);
  });
});

describe("library rules", () => {
  it("sets a student due date 14 days out and keeps a barcode", () => {
    const result = canIssue({ rules, book: book(), checkouts: [], memberId: "s1", today: "2026-11-09", kind: "student" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dueOn).toBe("2026-11-23");
      expect(result.barcode).toBe("b1-1");
    }
  });

  it("refuses a second book, an overdue member, and a reference copy", () => {
    expect(canIssue({ rules, book: book({ id: "b2" }), checkouts: [loan()], memberId: "s1", today: "2026-11-09", kind: "student" }).ok).toBe(false);
    expect(canIssue({ rules, book: book({ id: "b2" }), checkouts: [loan({ dueOn: "2026-11-01" })], memberId: "s1", today: "2026-11-09", kind: "student" }).error).toMatch(/overdue/i);
    expect(canIssue({ rules, book: book({ resourceType: "Reference" }), checkouts: [], memberId: "s2", today: "2026-11-09", kind: "student" }).error).toMatch(/library/i);
  });

  it("renews once and then stops", () => {
    expect(canRenew(rules, loan(), "2026-11-09", "student").ok).toBe(true);
    expect(canRenew(rules, loan({ renewals: 1 }), "2026-11-09", "student").ok).toBe(false);
    expect(availableBarcodes(book({ copies: 2 }), [loan({ barcode: "b1-1" })])).toEqual(["b1-2"]);
  });

  it("keeps titles and copies separate and queues the next member", () => {
    const title = book({ isbn: "978", edition: "2nd" });
    expect(findDuplicate([title], { isbn: "978", title: "Other", edition: "" })?.id).toBe("b1");
    const copy: LibraryCopy = { id: "b1-1", barcode: "b1-1", bookId: "b1", shelf: "A", status: "on loan", purchaseDate: "", price: 0, notes: "" };
    const waiting: Reservation = { id: "r1", bookId: "b1", memberId: "s2", memberName: "Meera", memberKind: "student", at: "2026-11-01", status: "waiting" };
    const result = returnCopy([copy], [waiting], "b1-1", "2026-11-09");
    expect(result.copies[0]?.status).toBe("reserved");
    expect(result.reservations[0]?.status).toBe("ready");
    expect(result.heldFor).toBe("Meera");
    const again = canIssue({
      rules,
      book: book(),
      checkouts: [loan({ barcode: "b1-1" })],
      memberId: "s2",
      today: "2026-11-09",
      kind: "student",
      barcode: "b1-1",
    });
    expect(again.ok).toBe(false);
    const facultyDue = canIssue({ rules, book: book({ id: "b9", copies: 1 }), checkouts: [], memberId: "f1", today: "2026-11-09", kind: "faculty" });
    expect(facultyDue.ok && facultyDue.dueOn).toBe("2026-12-09");
    expect(readBackup("{\"books\":[]}").ok).toBe(true);
    expect(readBackup("not json").ok).toBe(false);
    expect(previewRows(["2026-001"], [{ collegeId: "2026-001", name: "Aarav" }, { collegeId: "2026-002", name: "New" }])).toEqual([
      { collegeId: "2026-001", name: "Aarav", action: "update" },
      { collegeId: "2026-002", name: "New", action: "add" },
    ]);
  });
});
