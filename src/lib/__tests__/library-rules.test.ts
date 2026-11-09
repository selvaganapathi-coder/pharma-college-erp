import { describe, expect, it } from "vitest";
import { availableBarcodes, canIssue, canRenew, DEFAULT_LIBRARY_RULES, type LibraryRules } from "@/lib/library-rules";
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
});
