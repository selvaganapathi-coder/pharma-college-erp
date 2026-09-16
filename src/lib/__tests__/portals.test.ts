import { describe, expect, it } from "vitest";
import { accessDeniedMessage, loginPortalMatchesRole, portalForRole, portalHome } from "@/lib/portals";
import { normalizeTimetableSlot, findTimetableConflicts, slotTimes } from "@/lib/schedule";
import { linkedStudentIds, staffTeaching } from "@/lib/scope";
import { mergeCloud } from "@/lib/sync";
import { EMPTY_STATE, type AppState, type TimetableSlot, type User } from "@/lib/types";
import { searchErp } from "@/lib/search";
import { noticeVisibleTo } from "@/lib/notices";
import { can } from "@/lib/rbac";

const slot = (over: Partial<TimetableSlot>): TimetableSlot => ({
  id: "tt-123",
  sectionId: "s-a",
  day: "Monday",
  period: "09:00 AM – 10:00 AM",
  startTime: "09:00",
  endTime: "10:00",
  courseId: "c-pharm",
  staffId: "t-1",
  room: "101",
  ...over,
});

describe("portals", () => {
  it("routes each role to its portal", () => {
    expect(portalHome("admin")).toBe("/app");
    expect(portalHome("staff")).toBe("/staff");
    expect(portalHome("student")).toBe("/student");
    expect(portalHome("parent")).toBe("/parent");
    expect(portalForRole("admin")).toBe("admin");
  });
  it("rejects a student using the office login tab", () => {
    expect(loginPortalMatchesRole("office", "student")).toBe(false);
    expect(accessDeniedMessage("student")).toMatch(/Student Portal/);
  });
});

describe("timetable canonical times", () => {
  it("overwrites a stale period when start and end change", () => {
    const next = normalizeTimetableSlot(
      slot({ startTime: "10:30", endTime: "11:30", period: "09:00 AM – 10:00 AM" }),
    );
    expect(next.id).toBe("tt-123");
    expect(next.startTime).toBe("10:30");
    expect(next.endTime).toBe("11:30");
    expect(next.period).toBe("10:30 AM – 11:30 AM");
    expect(next.period).not.toMatch(/09:00/);
  });
  it("prefers start/end over a legacy period label", () => {
    const times = slotTimes(slot({ startTime: "10:15", endTime: "11:05", period: "9:00 AM" }));
    expect(times.start).toBe("10:15");
    expect(times.end).toBe("11:05");
  });
  it("ignores the same record when detecting conflicts", () => {
    const current = slot({ id: "tt-123", startTime: "10:30", endTime: "11:30" });
    const conflicts = findTimetableConflicts(current, [current], []);
    expect(conflicts).toHaveLength(0);
  });
});

describe("data scope", () => {
  it("resolves parent children from childStudentId or studentIds", () => {
    const parent: User = {
      id: "u1",
      email: "p@x",
      name: "Parent",
      role: "parent",
      phone: "",
      active: true,
      childStudentId: "st-1",
    };
    expect(linkedStudentIds(parent)).toEqual(["st-1"]);
    expect(linkedStudentIds({ ...parent, studentIds: ["st-2", "st-3"], childStudentId: "st-1" })).toEqual(["st-2", "st-3"]);
  });
  it("limits staff students to taught sections when timetable exists", () => {
    const state = {
      ...EMPTY_STATE,
      staff: [{ id: "t-1", staffCode: "1", name: "Dr P", email: "a", phone: "1", title: "P", qualification: "", departmentId: "d", courseIds: [], joinedOn: "", status: "active" as const }],
      timetable: [slot({ staffId: "t-1", sectionId: "s-a" })],
      students: [
        { id: "st-1", rollNo: "1", name: "A", email: "a", phone: "1", gender: "Female" as const, dob: "", bloodGroup: "", parentName: "", parentPhone: "", parentEmail: "", departmentId: "d", courseId: "c", sectionId: "s-a", year: 1, address: "", admissionDate: "", status: "active" as const },
        { id: "st-2", rollNo: "2", name: "B", email: "b", phone: "1", gender: "Male" as const, dob: "", bloodGroup: "", parentName: "", parentPhone: "", parentEmail: "", departmentId: "d", courseId: "c", sectionId: "s-b", year: 1, address: "", admissionDate: "", status: "active" as const },
      ],
    } as AppState;
    expect(staffTeaching(state, "t-1").students.map((s) => s.id)).toEqual(["st-1"]);
  });
  it("does not let a parent client id swap leak through linkedStudentIds", () => {
    const parent: User = {
      id: "u1",
      email: "p@x",
      name: "Parent",
      role: "parent",
      phone: "",
      active: true,
      childStudentId: "st-1",
    };
    expect(linkedStudentIds({ ...parent, childStudentId: "st-hack" })).toEqual(["st-hack"]);
    expect(linkedStudentIds(parent)).not.toContain("st-2");
  });
});

describe("sync isolation", () => {
  it("replaces local admin students when a scoped cloud payload is applied", () => {
    const local = { ...EMPTY_STATE, students: [{ id: "other", rollNo: "x", name: "Secret", email: "s", phone: "1", gender: "Female" as const, dob: "", bloodGroup: "", parentName: "", parentPhone: "", parentEmail: "", departmentId: "", courseId: "", sectionId: "", year: 1, address: "", admissionDate: "", status: "active" as const }] };
    const merged = mergeCloud(EMPTY_STATE, { students: [{ ...local.students[0], id: "mine", name: "Mine" }] }, true);
    expect(merged.students).toHaveLength(1);
    expect(merged.students[0].id).toBe("mine");
  });
});

describe("search and notices", () => {
  it("returns no global search hits for students or parents", () => {
    expect(searchErp(EMPTY_STATE, "Priya", "student")).toEqual([]);
    expect(searchErp(EMPTY_STATE, "Priya", "parent")).toEqual([]);
  });
  it("hides student-only notices from staff", () => {
    const staff: User = { id: "u", email: "s", name: "S", role: "staff", phone: "", active: true, staffId: "t-1" };
    expect(
      noticeVisibleTo(
        { id: "n", title: "Exam", body: "x", channels: ["inapp"], audience: "students", urgent: true, severity: "URGENT", createdAt: "", createdBy: "a", status: "sent", deliveryNote: "" },
        staff,
        EMPTY_STATE,
      ),
    ).toBe(false);
  });
  it("blocks staff from fee administration", () => {
    expect(can("staff", "fees", "read")).toBe(false);
    expect(can("staff", "audit", "read")).toBe(false);
    expect(can("admin", "students", "write")).toBe(true);
    expect(can("staff", "students", "write")).toBe(false);
  });
});
