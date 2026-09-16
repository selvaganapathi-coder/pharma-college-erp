"use client";

import { openDB, type IDBPDatabase } from "idb";
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AppState, AuditLog, CollectionKey, Role, User } from "./types";
import { COLLECTION_KEYS, EMPTY_STATE } from "./types";
import { isSampleRecord } from "./seed";
import { mergeCloud } from "./sync";
import { getFirebase } from "./firebase";

const DB_NAME = "gp-pharmacy-erp-v4";
const STORE = "kv";
const STATE_KEY = "app-state";
const OUTBOX_KEY = "outbox";
const SESSION_KEY = "gp-session-user-id";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";
export type WriteResult = { ok: boolean; error?: string; queued?: boolean };
export type Scope = { role: Role; studentId?: string };

type OutboxItem = { op: "set" | "archive"; key: CollectionKey; id: string; row?: unknown };

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export function stripSecrets<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  if (!("password" in row)) return row;
  const copy = { ...(row as object) } as T & { password?: string };
  delete copy.password;
  return copy;
}

function clean<T>(row: T): T {
  return JSON.parse(JSON.stringify(stripSecrets(row))) as T;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function stripSample(state: AppState): AppState {
  const next = { ...EMPTY_STATE } as AppState;
  for (const key of COLLECTION_KEYS) {
    const rows = state[key] as { id: string; email?: string; password?: string }[];
    (next[key] as unknown[]) = rows.filter((row) => !isSampleRecord(row)).map((row) => stripSecrets(row));
  }
  return next;
}

export async function loadState(): Promise<AppState> {
  const local = await (await db()).get(STORE, STATE_KEY);
  if (!local) {
    await persistLocal(EMPTY_STATE);
    return EMPTY_STATE;
  }
  const cleaned = stripSample(migrate(local as AppState));
  await persistLocal(cleaned);
  return cleaned;
}

function migrate(state: Partial<AppState>): AppState {
  return {
    ...EMPTY_STATE,
    ...state,
    users: (state.users ?? []).map((u) => stripSecrets({ ...u, password: undefined }) as User),
    feePlans: state.feePlans ?? [],
    notices: (state.notices ?? []).map((n) => ({
      ...n,
      severity: n.severity ?? (n.urgent ? "URGENT" : "INFO"),
      readBy: n.readBy ?? [],
    })),
    fees: (state.fees ?? []).map((f) => ({ ...f, status: f.status === "paid" ? "paid" : f.status })),
    courses: (state.courses ?? []).map((c) => ({
      ...c,
      kind: c.kind ?? (c.years > 1 ? "programme" : "subject"),
    })),
    sections: (state.sections ?? []).map((s) => ({
      ...s,
      capacity: s.capacity ?? 40,
      batch: s.batch ?? "",
      code: s.code ?? "",
      semester: s.semester ?? "",
      academicYear: s.academicYear ?? "",
      status: s.status ?? "active",
    })),
    staff: (state.staff ?? []).map((t) => ({
      ...t,
      qualification: t.qualification ?? "",
      courseIds: t.courseIds ?? [],
      staffType: t.staffType ?? (t.courseIds?.length ? "teaching" : "non-teaching"),
      experienceYears: t.experienceYears ?? 0,
      specialization: t.specialization ?? "",
      address: t.address ?? "",
    })),
    timetable: (state.timetable ?? []).map((slot) => ({
      ...slot,
      startTime: slot.startTime ?? "",
      endTime: slot.endTime ?? "",
    })),
    students: (state.students ?? []).map((s) => ({
      ...s,
      dob: s.dob ?? "",
      bloodGroup: s.bloodGroup ?? "",
      admissionDate: s.admissionDate ?? "",
      batch: s.batch ?? "",
    })),
    exams: (state.exams ?? []).map((e) => ({ ...e, sectionId: e.sectionId ?? "", locked: e.locked ?? false })),
    attendance: (state.attendance ?? []).map((a) => ({ ...a, sectionId: a.sectionId ?? "" })),
  };
}

export async function persistLocal(state: AppState) {
  await (await db()).put(STORE, clean(state), STATE_KEY);
}

async function readOutbox(): Promise<OutboxItem[]> {
  return ((await (await db()).get(STORE, OUTBOX_KEY)) as OutboxItem[] | undefined) ?? [];
}

async function writeOutbox(items: OutboxItem[]) {
  await (await db()).put(STORE, items, OUTBOX_KEY);
}

export async function hydrateFromCloud(scope?: Scope): Promise<{ ok: boolean; data: Partial<AppState> | null; error?: string }> {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return { ok: false, data: null, error: "Not signed in to cloud." };
  const patch: Partial<AppState> = {};
  const denied: string[] = [];
  for (const key of COLLECTION_KEYS) {
    try {
      const scoped = scopedQuery(key, scope);
      if (scoped === "skip") continue;
      if (scoped === "doc" && scope?.studentId && key === "students") {
        const snap = await getDoc(doc(fb.db, "students", scope.studentId));
        const rows = snap.exists() ? [stripSecrets({ id: snap.id, ...snap.data() })] : [];
        (patch as Record<string, unknown>)[key] = rows.filter((row) => !isSampleRecord(row as { id: string; email?: string }));
        continue;
      }
      const ref = typeof scoped === "object" ? scoped : collection(fb.db, key);
      const snap = await getDocs(ref);
      const rows = snap.docs
        .map((d) => stripSecrets({ id: d.id, ...d.data() }))
        .filter((row) => !isSampleRecord(row as { id: string; email?: string }));
      (patch as Record<string, unknown>)[key] = rows;
    } catch (err) {
      denied.push(key);
      if (scope?.role === "admin" || scope?.role === "staff" || !scope) {
        return { ok: false, data: null, error: err instanceof Error ? err.message : "Cloud read failed." };
      }
    }
  }
  return { ok: true, data: patch, error: denied.length ? `Skipped ${denied.join(", ")}.` : undefined };
}

export { mergeCloud };

export async function enqueueWrite(item: OutboxItem) {
  const box = await readOutbox();
  await writeOutbox([...box.filter((x) => !(x.key === item.key && x.id === item.id && x.op === item.op)), item]);
}

export async function flushOutbox(): Promise<WriteResult> {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return { ok: false, error: "Not signed in." };
  const box = await readOutbox();
  const remain: OutboxItem[] = [];
  for (const item of box) {
    try {
      if (item.op === "set" && item.row) {
        await setDoc(doc(fb.db, item.key, item.id), clean(item.row));
      } else if (item.op === "archive" && item.row) {
        await setDoc(doc(fb.db, item.key, item.id), clean(item.row));
      }
    } catch (err) {
      remain.push(item);
      return { ok: false, queued: true, error: err instanceof Error ? err.message : "Cloud write failed." };
    }
  }
  await writeOutbox(remain);
  return { ok: remain.length === 0, queued: remain.length > 0 };
}

export async function writeRow<K extends CollectionKey>(key: K, row: AppState[K][number]): Promise<WriteResult> {
  const item = clean(row) as AppState[K][number] & { id: string };
  const fb = getFirebase();
  if (!fb?.auth.currentUser) {
    await enqueueWrite({ op: "set", key, id: item.id, row: item });
    return { ok: false, queued: true, error: "Saved on this device. Sign in to sync with the college cloud." };
  }
  try {
    await setDoc(doc(fb.db, key, item.id), item);
    return { ok: true };
  } catch (err) {
    await enqueueWrite({ op: "set", key, id: item.id, row: item });
    return { ok: false, queued: true, error: err instanceof Error ? err.message : "Cloud save failed. Queued for retry." };
  }
}

export async function archiveRow<K extends CollectionKey>(key: K, row: AppState[K][number] & { deletedAt?: string }): Promise<WriteResult> {
  return writeRow(key, { ...row, deletedAt: new Date().toISOString() } as AppState[K][number]);
}

export function listenAll(
  onChange: (key: CollectionKey, rows: AppState[CollectionKey]) => void,
  onError: (message: string) => void,
  scope?: Scope,
) {
  const fb = getFirebase();
  if (!fb) return () => undefined;
  const unsubs: Unsubscribe[] = [];
  for (const key of COLLECTION_KEYS) {
    const scoped = scopedQuery(key, scope);
    if (scoped === "skip") continue;
    if (scoped === "doc" && scope?.studentId && (key === "students")) {
      unsubs.push(
        onSnapshot(
          doc(fb.db, "students", scope.studentId),
          (snap) => {
            const row = snap.exists() ? [stripSecrets({ id: snap.id, ...snap.data() })] : [];
            onChange("students", row as AppState["students"]);
          },
          (err) => onError(err.message),
        ),
      );
      continue;
    }
    const ref = typeof scoped === "object" ? scoped : collection(fb.db, key);
    unsubs.push(
      onSnapshot(
        ref,
        (snap) => {
          const rows = snap.docs
            .map((d) => stripSecrets({ id: d.id, ...d.data() }))
            .filter((row) => !isSampleRecord(row as { id: string; email?: string })) as AppState[CollectionKey];
          onChange(key, rows);
        },
        (err) => onError(`${key}: ${err.message}`),
      ),
    );
  }
  return () => unsubs.forEach((u) => u());
}

export function scopedQuery(key: CollectionKey, scope?: Scope) {
  const fb = getFirebase();
  if (!fb || !scope || scope.role === "admin" || scope.role === "staff") return "all";
  const sid = scope.studentId;
  if (!sid) return "skip";
  if (key === "users" || key === "staff" || key === "auditLogs" || key === "feePlans") return "skip";
  if (key === "students") return "doc";
  if (key === "fees" || key === "attendance" || key === "marks" || key === "checkouts") {
    return query(collection(fb.db, key), where("studentId", "==", sid));
  }
  return "all";
}

export async function uploadPhoto(folder: string, id: string, file: File) {
  if (file.size > 4 * 1024 * 1024) throw new Error("Photo must be under 4 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPG, PNG or WebP photo.");
  }
  const fb = getFirebase();
  if (fb?.auth.currentUser) {
    const path = `${folder}/${id}-${Date.now()}`;
    const r = ref(fb.storage, path);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  }
  return dataUrl(file);
}

function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.readAsDataURL(file);
  });
}

export function saveSession(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
}

export function readSession() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function makeAudit(
  actorId: string,
  actorName: string,
  action: string,
  entity: string,
  entityId: string,
  details: string,
): AuditLog {
  return {
    id: uid("log"),
    at: new Date().toISOString(),
    actorId,
    actorName,
    action,
    entity,
    entityId,
    details,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
  };
}

export async function loadUserProfile(uid: string, email: string): Promise<User | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const byUid = await getDoc(doc(fb.db, "users", uid));
  if (byUid.exists()) return stripSecrets({ id: byUid.id, ...byUid.data() }) as User;
  return email ? null : null;
}
