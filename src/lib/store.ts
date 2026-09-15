"use client";

import { openDB, type IDBPDatabase } from "idb";
import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AppState, AuditLog, CollectionKey } from "./types";
import { COLLECTION_KEYS, EMPTY_STATE } from "./types";
import { isSampleRecord } from "./seed";
import { getFirebase } from "./firebase";

const DB_NAME = "gp-pharmacy-erp-v3";
const STORE = "kv";
const STATE_KEY = "app-state";
const SESSION_KEY = "gp-session-user-id";

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

function clean<T>(row: T): T {
  return JSON.parse(JSON.stringify(row)) as T;
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function stripSample(state: AppState): AppState {
  const next = { ...EMPTY_STATE } as AppState;
  for (const key of COLLECTION_KEYS) {
    const rows = state[key] as { id: string; email?: string }[];
    (next[key] as unknown[]) = rows.filter((row) => !isSampleRecord(row));
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
    feePlans: state.feePlans ?? [],
    courses: (state.courses ?? []).map((c) => ({
      ...c,
      kind: c.kind ?? (c.years > 1 ? "programme" : "subject"),
    })),
    sections: (state.sections ?? []).map((s) => ({ ...s, capacity: s.capacity ?? 40 })),
    staff: (state.staff ?? []).map((t) => ({
      ...t,
      qualification: t.qualification ?? "",
      courseIds: t.courseIds ?? [],
    })),
    students: (state.students ?? []).map((s) => ({
      ...s,
      dob: s.dob ?? "",
      bloodGroup: s.bloodGroup ?? "",
      admissionDate: s.admissionDate ?? "",
    })),
    exams: (state.exams ?? []).map((e) => ({ ...e, sectionId: e.sectionId ?? "", locked: e.locked ?? false })),
    attendance: (state.attendance ?? []).map((a) => ({ ...a, sectionId: a.sectionId ?? "" })),
  };
}

export async function persistLocal(state: AppState) {
  await (await db()).put(STORE, clean(state), STATE_KEY);
}

export async function hydrateFromCloud(): Promise<Partial<AppState> | null> {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return null;
  try {
    const patch: Partial<AppState> = {};
    for (const key of COLLECTION_KEYS) {
      const snap = await getDocs(collection(fb.db, key));
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => !isSampleRecord(row as { id: string; email?: string }));
      (patch as Record<string, unknown>)[key] = rows;
    }
    return patch;
  } catch {
    return null;
  }
}

export function mergeCloud(local: AppState, cloud: Partial<AppState>): AppState {
  const next = { ...local };
  for (const key of COLLECTION_KEYS) {
    const rows = cloud[key];
    if (Array.isArray(rows) && rows.length > 0) {
      (next[key] as AppState[typeof key]) = rows as AppState[typeof key];
    }
  }
  return next;
}

export async function pushMissingToCloud(state: AppState) {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return;
  try {
    for (const key of COLLECTION_KEYS) {
      const snap = await getDocs(collection(fb.db, key));
      if (!snap.empty) continue;
      for (const row of state[key] as { id: string }[]) {
        await setDoc(doc(fb.db, key, row.id), clean(row));
      }
    }
  } catch {
    /* rules or offline */
  }
}

export async function writeRow<K extends CollectionKey>(key: K, row: AppState[K][number]) {
  const item = clean(row) as AppState[K][number] & { id: string };
  const fb = getFirebase();
  if (fb?.auth.currentUser) {
    try {
      await setDoc(doc(fb.db, key, item.id), item);
    } catch {
      /* local still saved */
    }
  }
}

export async function removeRow(key: CollectionKey, id: string) {
  const fb = getFirebase();
  if (fb?.auth.currentUser) {
    try {
      await deleteDoc(doc(fb.db, key, id));
    } catch {
      /* local still saved */
    }
  }
}

export async function purgeSampleFromCloud() {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return;
  try {
    for (const key of COLLECTION_KEYS) {
      const snap = await getDocs(collection(fb.db, key));
      for (const d of snap.docs) {
        const email = (d.data() as { email?: string }).email;
        if (isSampleRecord({ id: d.id, email })) {
          await deleteDoc(d.ref);
        }
      }
    }
  } catch {
    /* rules */
  }
}

export function listenAll(onChange: (key: CollectionKey, rows: AppState[CollectionKey]) => void) {
  const fb = getFirebase();
  if (!fb) return () => undefined;
  const unsubs = COLLECTION_KEYS.map((key) =>
    onSnapshot(collection(fb.db, key), (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => !isSampleRecord(row as { id: string; email?: string })) as AppState[CollectionKey];
      onChange(key, rows);
    }),
  );
  return () => unsubs.forEach((u) => u());
}

export async function uploadPhoto(folder: string, id: string, file: File) {
  if (file.size > 4 * 1024 * 1024) throw new Error("Photo must be under 4 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP photo.");
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
