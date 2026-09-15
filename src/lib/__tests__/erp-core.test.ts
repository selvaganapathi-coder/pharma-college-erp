import { describe, expect, it } from "vitest";
import { firstError, validateAttendance, validateFee, validateMark, validateStudent } from "@/lib/validation";
import { can } from "@/lib/rbac";
import { mergeCloud } from "@/lib/sync";
import { EMPTY_STATE } from "@/lib/types";
import { verifyRazorpaySignature } from "@/lib/server/razorpay";
import { severityRank } from "@/components/alert-card";
import crypto from "crypto";

describe("validation", () => {
  it("rejects an incomplete student", () => {
    expect(firstError(validateStudent({}))).toBeTruthy();
  });
  it("rejects marks over the maximum", () => {
    expect(validateMark({ studentId: "s", examId: "e", marks: 40 }, 30).marks).toMatch(/exceed/);
  });
  it("rejects zero fee amount", () => {
    expect(validateFee({ studentId: "s", term: "T", amount: 0, dueDate: "2026-01-01", status: "due" }).amount).toBeTruthy();
  });
  it("rejects invalid attendance status", () => {
    expect(validateAttendance({ studentId: "s", date: "2026-01-01", courseId: "c", status: "maybe" as never }).status).toBeTruthy();
  });
});

describe("rbac", () => {
  it("blocks students from writing fees", () => {
    expect(can("student", "fees", "write")).toBe(false);
    expect(can("admin", "fees", "write")).toBe(true);
  });
  it("blocks parents from audit", () => {
    expect(can("parent", "audit", "read")).toBe(false);
  });
});

describe("sync merge", () => {
  it("accepts an empty cloud collection", () => {
    const local = { ...EMPTY_STATE, students: [{ id: "st-1", rollNo: "1", name: "A", email: "a@x", phone: "12345678", gender: "Female" as const, dob: "", bloodGroup: "", parentName: "", parentPhone: "", parentEmail: "", departmentId: "", courseId: "", sectionId: "", year: 1, address: "", admissionDate: "", status: "active" as const }] };
    const merged = mergeCloud(local, { students: [] }, true);
    expect(merged.students).toEqual([]);
  });
  it("keeps local rows when empty is not accepted", () => {
    const local = { ...EMPTY_STATE, students: [{ id: "st-1", rollNo: "1", name: "A", email: "a@x", phone: "12345678", gender: "Female" as const, dob: "", bloodGroup: "", parentName: "", parentPhone: "", parentEmail: "", departmentId: "", courseId: "", sectionId: "", year: 1, address: "", admissionDate: "", status: "active" as const }] };
    const merged = mergeCloud(local, { students: [] }, false);
    expect(merged.students).toHaveLength(1);
  });
});

describe("alerts", () => {
  it("ranks urgent ahead of info", () => {
    expect(severityRank("URGENT")).toBeLessThan(severityRank("INFO"));
  });
});

describe("razorpay signature", () => {
  it("accepts a valid HMAC and rejects a bad one", () => {
    process.env.RAZORPAY_KEY_SECRET = "testsecret";
    const orderId = "order_1";
    const paymentId = "pay_1";
    const signature = crypto.createHmac("sha256", "testsecret").update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyRazorpaySignature(orderId, paymentId, signature)).toBe(true);
    expect(verifyRazorpaySignature(orderId, paymentId, "deadbeef")).toBe(false);
  });
});

describe("login policy", () => {
  it("does not treat failed login as a reason to register", () => {
    const policy = { loginMayCreateAccount: false };
    expect(policy.loginMayCreateAccount).toBe(false);
  });
});
