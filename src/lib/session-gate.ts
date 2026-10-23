import type { Role, User } from "./types";

/** Sign-in must not wait on a full collection scan. Cloud data loads after navigation. */
export const LOGIN_WAITS_FOR_COLLECTION_HYDRATE = false;

export function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function profileGate(profile: User | null): { ok: true; role: Role } | { ok: false; error: string } {
  if (!profile) {
    return { ok: false, error: "This login has no college profile. Ask the office to create your access." };
  }
  if (!profile.active) {
    return { ok: false, error: "This login is disabled. Ask the office to turn it back on." };
  }
  if (profile.role === "student" && !profile.studentId) {
    return { ok: false, error: "This login is not linked to a student record." };
  }
  if (profile.role === "parent" && !profile.childStudentId && !(profile.studentIds && profile.studentIds.length)) {
    return { ok: false, error: "This login is not linked to a student record." };
  }
  if (profile.role !== "admin" && profile.role !== "staff" && profile.role !== "student" && profile.role !== "parent") {
    return { ok: false, error: "This login has no portal role. Ask the office to set one." };
  }
  return { ok: true, role: profile.role };
}

/**
 * Authenticate, read only the user profile, then return.
 * `onReady` may start listeners; this function does not await that work.
 */
export async function signInAndOpen(input: {
  signIn: () => Promise<{ ok: boolean; note?: string }>;
  loadProfile: () => Promise<User | null>;
  onReady?: (profile: User) => void | Promise<void>;
  profileTimeoutMs?: number;
}): Promise<{ error: string | null; role?: Role }> {
  const signed = await input.signIn();
  if (!signed.ok) return { error: signed.note ?? "Sign-in failed." };
  let profile: User | null;
  try {
    profile = await withTimeout(
      input.loadProfile(),
      input.profileTimeoutMs ?? 8000,
      "Could not load your college profile in time. Check your connection and try again.",
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not load your college profile." };
  }
  const gate = profileGate(profile);
  if (!gate.ok || !profile) return { error: gate.ok ? "This login has no college profile. Ask the office to create your access." : gate.error };
  void input.onReady?.(profile);
  return { error: null, role: gate.role };
}
