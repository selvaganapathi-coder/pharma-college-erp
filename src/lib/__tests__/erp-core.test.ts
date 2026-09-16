import { describe, expect, it } from "vitest";
import { firstError, validateAttendance, validateFee, validateMark, validateStudent } from "@/lib/validation";
import { can } from "@/lib/rbac";
import { mergeCloud } from "@/lib/sync";
import { EMPTY_STATE, type AppState } from "@/lib/types";
import { verifyRazorpaySignature } from "@/lib/server/razorpay";
import { severityRank } from "@/components/alert-card";
import { nextPlacementAfterDepartment, programmesForDepartment, sameBatch, validateStudentPlacement } from "@/lib/catalog";
import { findTimetableConflicts, validateSlotTimes } from "@/lib/schedule";
import { getCourseName, getDepartmentName, getSectionName, getStudentName } from "@/lib/references";
import { searchErp } from "@/lib/search";
import crypto from "crypto";

const catalog = {
  departments: [{ id: "d-pharm", code: "PH", name: "Pharmacy", head: "Dean" }],
  courses: [
    { id: "c-bpharm", code: "BPH", name: "B.Pharm", departmentId: "d-pharm", years: 4, credits: 160, kind: "programme" as const },
    { id: "c-other", code: "OTH", name: "Other", departmentId: "d-x", years: 2, credits: 40, kind: "programme" as const },
  ],
  sections: [{ id: "s-a", name: "A", courseId: "c-bpharm", year: 1, batch: "2026–2030", room: "101", capacity: 40 }],
};

describe("validation", () => {
  it("rejects an incomplete student", () => {
    expect(firstError(validateStudent({}))).toBeTruthy();
  });
  it("rejects a course from another department", () => {
    const errors = validateStudentPlacement(
      { departmentId: "d-pharm", courseId: "c-other", sectionId: "s-a" },
      catalog,
    );
    expect(errors.courseId).toMatch(/department/);
  });
  it("accepts a matching department, course, and section", () => {
    expect(
      firstError(
        validateStudentPlacement(
          { departmentId: "d-pharm", courseId: "c-bpharm", sectionId: "s-a", batch: "2026–2030" },
          catalog,
        ),
      ),
    ).toBeNull();
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

describe("catalog cascade", () => {
  it("lists programmes for a department by name relationship", () => {
    expect(programmesForDepartment(catalog.courses, "d-pharm").map((c) => c.name)).toEqual(["B.Pharm"]);
  });
  it("treats hyphen and en-dash batch labels as the same intake", () => {
    expect(sameBatch("2026-2030", "2026–2030")).toBe(true);
    expect(
      firstError(
        validateStudentPlacement(
          { departmentId: "d-pharm", courseId: "c-bpharm", sectionId: "s-a", batch: "2026-2030" },
          catalog,
        ),
      ),
    ).toBeNull();
  });
  it("falls back to multi-year courses when kind is missing programme", () => {
    const mixed = [
      { id: "c-bpharm", code: "BPH", name: "B.Pharm", departmentId: "d-pharm", years: 4, credits: 160, kind: "subject" as const },
    ];
    expect(programmesForDepartment(mixed, "d-pharm").map((c) => c.name)).toEqual(["B.Pharm"]);
  });
  it("clears course when the department has more than one programme", () => {
    const extra = {
      ...catalog,
      courses: [
        ...catalog.courses,
        { id: "c-dpharm", code: "DPH", name: "D.Pharm", departmentId: "d-pharm", years: 2, credits: 80, kind: "programme" as const },
      ],
    };
    const next = nextPlacementAfterDepartment(extra, "d-pharm");
    expect(next.courseId).toBe("");
    expect(next.sectionId).toBe("");
  });
});

describe("reference labels", () => {
  const state = {
    ...EMPTY_STATE,
    ...catalog,
    students: [
      {
        id: "st-1",
        rollNo: "BPH20260021",
        name: "Priya S",
        email: "priya@x",
        phone: "1234567890",
        gender: "Female" as const,
        dob: "2006-01-01",
        bloodGroup: "O+",
        parentName: "Parent",
        parentPhone: "1234567890",
        parentEmail: "",
        departmentId: "d-pharm",
        courseId: "c-bpharm",
        sectionId: "s-a",
        year: 1,
        address: "Hosur",
        admissionDate: "2026-01-01",
        status: "active" as const,
      },
    ],
  } as AppState;
  it("resolves department, course, and section names instead of ids", () => {
    expect(getDepartmentName(state, "d-pharm")).toBe("Pharmacy");
    expect(getCourseName(state, "c-bpharm")).toContain("B.Pharm");
    expect(getSectionName(state, "s-a")).toContain("A");
    expect(getSectionName(state, "s-a")).not.toBe("s-a");
    expect(getStudentName(state, "st-1")).toBe("Priya S");
  });
  it("searches students and departments by name", () => {
    expect(searchErp(state, "Priya")[0]?.title).toBe("Priya S");
    expect(searchErp(state, "Pharmacy").some((h) => h.kind === "Department")).toBe(true);
  });
  it("uses a safe fallback for missing ids", () => {
    expect(getDepartmentName(state, "missing")).toBe("Unknown Department");
    expect(getStudentName(state, "nope")).toBe("Unknown Student");
  });
});

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

describe("timetable conflicts", () => {
  it("rejects an end time that is not later than start", () => {
    expect(validateSlotTimes("10:00", "09:00")).toMatch(/later/);
  });
  it("detects overlapping staff on the same day", () => {
    const conflicts = findTimetableConflicts(
      {
        id: "tt-2",
        sectionId: "s-b",
        day: "Monday",
        period: "10:00 AM",
        startTime: "10:00",
        endTime: "11:00",
        courseId: "c-pharm",
        staffId: "t-1",
        room: "102",
      },
      [
        {
          id: "tt-1",
          sectionId: "s-a",
          day: "Monday",
          period: "9:00 AM",
          startTime: "09:30",
          endTime: "10:30",
          courseId: "c-pharm",
          staffId: "t-1",
          room: "101",
        },
      ],
      [{ id: "t-1", staffCode: "STF001", name: "Dr. Priya Kumar", email: "p@x", phone: "12345678", title: "Professor", qualification: "", departmentId: "d-pharm", courseIds: [], joinedOn: "", status: "active" }],
    );
    expect(conflicts.some((c) => c.kind === "staff")).toBe(true);
    expect(conflicts[0].message).toContain("Dr. Priya Kumar");
  });
});

describe("login policy", () => {
  it("does not treat failed login as a reason to register", () => {
    const policy = { loginMayCreateAccount: false };
    expect(policy.loginMayCreateAccount).toBe(false);
  });
});
