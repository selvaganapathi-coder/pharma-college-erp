import { describe, expect, it } from "vitest";
import { profileGate, signInAndOpen, withTimeout, LOGIN_WAITS_FOR_COLLECTION_HYDRATE } from "@/lib/session-gate";
import type { User } from "@/lib/types";

const user = (over: Partial<User>): User => ({
  id: "u1",
  email: "a@college.edu",
  name: "A",
  role: "admin",
  phone: "",
  active: true,
  ...over,
});

describe("portal opens from the profile alone", () => {
  it("does not wait for a full collection hydrate", () => {
    expect(LOGIN_WAITS_FOR_COLLECTION_HYDRATE).toBe(false);
  });

  it("accepts admin, staff, student, and parent profiles", () => {
    expect(profileGate(user({ role: "admin" })).ok).toBe(true);
    expect(profileGate(user({ role: "staff", staffId: "t1" })).ok).toBe(true);
    expect(profileGate(user({ role: "student", studentId: "s1" })).ok).toBe(true);
    expect(profileGate(user({ role: "parent", childStudentId: "s1" })).ok).toBe(true);
  });

  it("rejects a student or parent who is not linked", () => {
    expect(profileGate(user({ role: "student" })).ok).toBe(false);
    expect(profileGate(user({ role: "parent" })).ok).toBe(false);
    expect(profileGate(null).ok).toBe(false);
    expect(profileGate(user({ active: false })).ok).toBe(false);
  });

  it("returns the role before a slow cloud load finishes", async () => {
    let finished = false;
    const slow = new Promise<void>((resolve) => {
      setTimeout(() => {
        finished = true;
        resolve();
      }, 250);
    });
    const started = Date.now();
    const result = await signInAndOpen({
      signIn: async () => ({ ok: true }),
      loadProfile: async () => user({ role: "staff", staffId: "t1" }),
      onReady: () => slow,
    });
    expect(result).toEqual({ error: null, role: "staff" });
    expect(Date.now() - started).toBeLessThan(200);
    expect(finished).toBe(false);
    await slow;
  });

  it("times out a stuck profile read", async () => {
    const result = await signInAndOpen({
      signIn: async () => ({ ok: true }),
      loadProfile: () => new Promise(() => undefined),
      profileTimeoutMs: 20,
    });
    expect(result.error).toMatch(/time/i);
    expect(result.role).toBeUndefined();
  });
});

describe("withTimeout", () => {
  it("returns the value when the work finishes", async () => {
    await expect(withTimeout(Promise.resolve(7), 50, "slow")).resolves.toBe(7);
  });
});
