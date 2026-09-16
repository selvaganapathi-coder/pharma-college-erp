"use client";

import { openDB, type IDBPDatabase } from "idb";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AppState, AuditLog, CollectionKey, Course, Department, Notice, Section, Staff, Student, TimetableSlot, User } from "./types";
import { COLLECTION_KEYS, EMPTY_STATE } from "./types";
import { isSampleRecord } from "./seed";
import { mergeCloud } from "./sync";
import { getFirebase } from "./firebase";
import { normalizeTimetableSlot } from "./schedule";
import type { DataScope } from "./scope";

const DB_NAME = "gp-pharmacy-erp-v4";
const STORE = "kv";
const SESSION_KEY = "gp-session-user-id";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";
export type WriteResult = { ok: boolean; error?: string; queued?: boolean };
export type Scope = DataScope;

type OutboxItem = { op: "set" | "archive" | "delete"; key: CollectionKey; id: string; row?: unknown };

let dbPromise: Promise<IDBPDatabase> | null = null;
let currentOwner = "";

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

function stateKey(ownerId: string) {
  return `app-state:${ownerId}`;
}
function outboxKey(ownerId: string) {
  return `outbox:${ownerId}`;
}

export function setDataOwner(ownerId: string | null) {
  currentOwner = ownerId ?? "";
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

function asRow<T extends { id: string }>(id: string, data: Record<string, unknown>): T {
  return stripSecrets({ id, ...data }) as T;
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

export async function loadState(ownerId?: string): Promise<AppState> {
  const id = ownerId ?? currentOwner;
  if (!id) return EMPTY_STATE;
  const local = await (await db()).get(STORE, stateKey(id));
  if (!local) {
    const legacy = await (await db()).get(STORE, "app-state");
    if (legacy) {
      const cleaned = stripSample(migrate(legacy as AppState));
      await persistLocal(cleaned, id);
      return cleaned;
    }
    await persistLocal(EMPTY_STATE, id);
    return EMPTY_STATE;
  }
  const cleaned = stripSample(migrate(local as AppState));
  await persistLocal(cleaned, id);
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
    timetable: (state.timetable ?? []).map((slot) => normalizeTimetableSlot(slot)),
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

export async function persistLocal(state: AppState, ownerId?: string) {
  const id = ownerId ?? currentOwner;
  if (!id) return;
  await (await db()).put(STORE, clean(state), stateKey(id));
}

export async function wipeOwnerData(ownerId?: string) {
  const id = ownerId ?? currentOwner;
  if (!id) return;
  await (await db()).put(STORE, clean(EMPTY_STATE), stateKey(id));
  await (await db()).put(STORE, [], outboxKey(id));
}

async function readOutbox(): Promise<OutboxItem[]> {
  if (!currentOwner) return [];
  return ((await (await db()).get(STORE, outboxKey(currentOwner))) as OutboxItem[] | undefined) ?? [];
}

async function writeOutbox(items: OutboxItem[]) {
  if (!currentOwner) return;
  await (await db()).put(STORE, items, outboxKey(currentOwner));
}

async function mapDocs<T extends { id: string }>(snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) {
  return snap.docs
    .map((d) => asRow<T>(d.id, d.data()))
    .filter((row) => !isSampleRecord(row as { id: string; email?: string }));
}

async function fetchDoc<T extends { id: string }>(path: string, id: string): Promise<T | null> {
  const fb = getFirebase();
  if (!fb || !id) return null;
  const snap = await getDoc(doc(fb.db, path, id));
  if (!snap.exists()) return null;
  const row = asRow<T>(snap.id, snap.data() as Record<string, unknown>);
  if (isSampleRecord(row as { id: string; email?: string })) return null;
  return row;
}

async function fetchQuery<T extends { id: string }>(q: Query): Promise<T[]> {
  const snap = await getDocs(q);
  return mapDocs<T>(snap);
}

export async function hydrateFromCloud(scope?: Scope): Promise<{ ok: boolean; data: Partial<AppState> | null; error?: string }> {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return { ok: false, data: null, error: "Not signed in to cloud." };
  try {
    if (!scope || scope.role === "admin") {
      return hydrateAdmin();
    }
    if (scope.role === "staff") {
      return { ok: true, data: await hydrateStaff(scope) };
    }
    return { ok: true, data: await hydrateLinkedPerson(scope) };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : "Cloud read failed." };
  }
}

async function hydrateAdmin(): Promise<{ ok: boolean; data: Partial<AppState> | null; error?: string }> {
  const fb = getFirebase()!;
  const patch: Partial<AppState> = {};
  const denied: string[] = [];
  for (const key of COLLECTION_KEYS) {
    try {
      const snap = await getDocs(collection(fb.db, key));
      (patch as Record<string, unknown>)[key] = await mapDocs(snap);
    } catch {
      denied.push(key);
    }
  }
  if (denied.length === COLLECTION_KEYS.length) {
    return { ok: false, data: null, error: `Cloud read failed (${denied.join(", ")}).` };
  }
  return { ok: true, data: patch, error: denied.length ? `Skipped ${denied.join(", ")}.` : undefined };
}

async function hydrateLinkedPerson(scope: DataScope): Promise<Partial<AppState>> {
  const fb = getFirebase()!;
  const sid = scope.studentId;
  const patch: Partial<AppState> = { ...EMPTY_STATE };
  if (!sid) return patch;
  const student = await fetchDoc<Student>("students", sid);
  patch.students = student ? [student] : [];
  if (!student) return patch;

  const [department, course, section, route] = await Promise.all([
    fetchDoc<Department>("departments", student.departmentId),
    fetchDoc<Course>("courses", student.courseId),
    fetchDoc<Section>("sections", student.sectionId),
    student.busRouteId ? fetchDoc<AppState["routes"][number]>("routes", student.busRouteId) : Promise.resolve(null),
  ]);
  patch.departments = department ? [department] : [];
  patch.courses = course ? [course] : [];
  patch.sections = section ? [section] : [];
  patch.routes = route ? [route] : [];

  const [timetable, exams, attendance, marks, fees, checkouts, targeted, sectionNotices, books] = await Promise.all([
    fetchQuery<TimetableSlot>(query(collection(fb.db, "timetable"), where("sectionId", "==", student.sectionId))),
    fetchQuery(query(collection(fb.db, "exams"), where("sectionId", "==", student.sectionId))),
    fetchQuery(query(collection(fb.db, "attendance"), where("studentId", "==", sid))),
    fetchQuery(query(collection(fb.db, "marks"), where("studentId", "==", sid))),
    fetchQuery(query(collection(fb.db, "fees"), where("studentId", "==", sid))),
    fetchQuery(query(collection(fb.db, "checkouts"), where("studentId", "==", sid))),
    fetchQuery<Notice>(query(collection(fb.db, "notices"), where("studentId", "==", sid))),
    student.sectionId
      ? fetchQuery<Notice>(query(collection(fb.db, "notices"), where("sectionId", "==", student.sectionId)))
      : Promise.resolve([] as Notice[]),
    fetchQuery(collection(fb.db, "books")).catch(() => []),
  ]);

  const subjectIds = [...new Set(timetable.map((t) => t.courseId).filter(Boolean))];
  const staffIds = [...new Set(timetable.map((t) => t.staffId).filter(Boolean))];
  const subjects = (await Promise.all(subjectIds.map((id) => fetchDoc<Course>("courses", id)))).filter(Boolean);
  const teachers = (await Promise.all(staffIds.map((id) => fetchDoc<Staff>("staff", id)))).filter(Boolean);

  patch.courses = [...(patch.courses ?? []), ...subjects.filter((c): c is NonNullable<typeof c> => Boolean(c))].filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
  );
  patch.staff = teachers.filter((row): row is Staff => Boolean(row));
  patch.timetable = timetable.map(normalizeTimetableSlot);
  patch.exams = exams as AppState["exams"];
  patch.attendance = attendance as AppState["attendance"];
  patch.marks = marks as AppState["marks"];
  patch.fees = fees as AppState["fees"];
  patch.checkouts = checkouts as AppState["checkouts"];
  patch.books = books as AppState["books"];
  const noticeMap = new Map<string, Notice>();
  for (const n of [...targeted, ...sectionNotices]) noticeMap.set(n.id, n);
  patch.notices = [...noticeMap.values()];
  patch.messages = [];
  try {
    const msgs = await fetchQuery(query(collection(fb.db, "messages"), where("sectionId", "==", student.sectionId)));
    patch.messages = msgs as AppState["messages"];
  } catch {
    patch.messages = [];
  }
  return patch;
}

async function hydrateStaff(scope: DataScope): Promise<Partial<AppState>> {
  const fb = getFirebase()!;
  const patch: Partial<AppState> = { ...EMPTY_STATE };
  if (!scope.staffId) return patch;
  const me = await fetchDoc<Staff>("staff", scope.staffId);
  patch.staff = me ? [me] : [];
  if (!me) return patch;
  const department = await fetchDoc<Department>("departments", me.departmentId);
  patch.departments = department ? [department] : [];
  const courses = await fetchQuery(query(collection(fb.db, "courses"), where("departmentId", "==", me.departmentId))).catch(
    () => [] as AppState["courses"],
  );
  patch.courses = courses as AppState["courses"];
  const timetable = (
    await fetchQuery<TimetableSlot>(query(collection(fb.db, "timetable"), where("staffId", "==", me.id)))
  ).map(normalizeTimetableSlot);
  patch.timetable = timetable;
  const sectionIds = [...new Set(timetable.map((t) => t.sectionId).filter(Boolean))];
  const sections = (await Promise.all(sectionIds.map((id) => fetchDoc<Section>("sections", id)))).filter(
    Boolean,
  ) as Section[];
  patch.sections = sections;

  const studentChunks = await Promise.all(
    sectionIds.map((id) => fetchQuery(query(collection(fb.db, "students"), where("sectionId", "==", id)))),
  );
  const studentMap = new Map<string, AppState["students"][number]>();
  for (const row of studentChunks.flat() as AppState["students"]) {
    if (!row.deletedAt) studentMap.set(row.id, row);
  }
  patch.students = [...studentMap.values()];

  const examChunks = await Promise.all(
    sectionIds.map((id) => fetchQuery(query(collection(fb.db, "exams"), where("sectionId", "==", id)))),
  );
  const exams = examChunks.flat() as AppState["exams"];
  patch.exams = exams.filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);

  const attChunks = await Promise.all(
    sectionIds.map((id) => fetchQuery(query(collection(fb.db, "attendance"), where("sectionId", "==", id)))),
  );
  patch.attendance = attChunks.flat() as AppState["attendance"];

  const markChunks = await Promise.all(
    patch.exams.map((e) => fetchQuery(query(collection(fb.db, "marks"), where("examId", "==", e.id)))),
  );
  patch.marks = markChunks.flat() as AppState["marks"];

  try {
    const notices = await fetchQuery<Notice>(collection(fb.db, "notices"));
    patch.notices = notices.filter((n) => {
      const aud = (n.audience || "all").toLowerCase();
      return aud !== "students" && aud !== "parents" && aud !== "parent" && aud !== "student";
    });
  } catch {
    patch.notices = [];
  }
  try {
    patch.messages = (await fetchQuery(collection(fb.db, "messages"))) as AppState["messages"];
  } catch {
    patch.messages = [];
  }
  return patch;
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
      if (item.op === "delete") {
        await deleteDoc(doc(fb.db, item.key, item.id));
      } else if ((item.op === "set" || item.op === "archive") && item.row) {
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

function prepareRow<K extends CollectionKey>(key: K, row: AppState[K][number]) {
  const item = clean(row) as AppState[K][number] & { id: string };
  if (key === "timetable") {
    return normalizeTimetableSlot(item as TimetableSlot) as AppState[K][number] & { id: string };
  }
  return item;
}

export async function writeRow<K extends CollectionKey>(key: K, row: AppState[K][number]): Promise<WriteResult> {
  const item = prepareRow(key, row);
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

export async function deleteRow(key: CollectionKey, id: string): Promise<WriteResult> {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) {
    await enqueueWrite({ op: "delete", key, id });
    return { ok: false, queued: true, error: "Removed on this device. Sign in to sync with the college cloud." };
  }
  try {
    await deleteDoc(doc(fb.db, key, id));
    return { ok: true };
  } catch (err) {
    await enqueueWrite({ op: "delete", key, id });
    return { ok: false, queued: true, error: err instanceof Error ? err.message : "Cloud delete failed. Queued for retry." };
  }
}

export async function archiveRow<K extends CollectionKey>(key: K, row: AppState[K][number] & { deletedAt?: string }): Promise<WriteResult> {
  return writeRow(key, { ...row, deletedAt: new Date().toISOString() } as AppState[K][number]);
}

function listenQuery(
  q: Query,
  key: CollectionKey,
  onChange: (key: CollectionKey, rows: AppState[CollectionKey]) => void,
  onError: (message: string) => void,
  transform?: (rows: AppState[CollectionKey]) => AppState[CollectionKey],
) {
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => stripSecrets({ id: d.id, ...d.data() }))
        .filter((row) => !isSampleRecord(row as { id: string; email?: string })) as AppState[CollectionKey];
      onChange(key, transform ? transform(rows) : rows);
    },
    (err) => onError(`${key}: ${err.message}`),
  );
}

export function listenAll(
  onChange: (key: CollectionKey, rows: AppState[CollectionKey]) => void,
  onError: (message: string) => void,
  scope?: Scope,
) {
  const fb = getFirebase();
  if (!fb) return () => undefined;
  const unsubs: Unsubscribe[] = [];

  if (!scope || scope.role === "admin") {
    for (const key of COLLECTION_KEYS) {
      unsubs.push(
        listenQuery(collection(fb.db, key), key, onChange, onError, (rows) =>
          key === "timetable" ? ((rows as TimetableSlot[]).map(normalizeTimetableSlot) as AppState[CollectionKey]) : rows,
        ),
      );
    }
    return () => unsubs.forEach((u) => u());
  }

  const noticeParts = new Map<string, Notice[]>();
  const publishNotices = () => {
    const map = new Map<string, Notice>();
    for (const rows of noticeParts.values()) for (const n of rows) map.set(n.id, n);
    onChange("notices", [...map.values()] as AppState["notices"]);
  };

  if (scope.role === "student" || scope.role === "parent") {
    const sid = scope.studentId;
    if (!sid) return () => undefined;
    unsubs.push(
      onSnapshot(
        doc(fb.db, "students", sid),
        (snap) => {
          const row = snap.exists() ? [stripSecrets({ id: snap.id, ...snap.data() })] : [];
          onChange("students", row as AppState["students"]);
        },
        (err) => onError(err.message),
      ),
    );
    const sectionId = scope.sectionId;
    if (sectionId) {
      unsubs.push(
        listenQuery(
          query(collection(fb.db, "timetable"), where("sectionId", "==", sectionId)),
          "timetable",
          onChange,
          onError,
          (rows) => (rows as TimetableSlot[]).map(normalizeTimetableSlot) as AppState[CollectionKey],
        ),
      );
      unsubs.push(listenQuery(query(collection(fb.db, "exams"), where("sectionId", "==", sectionId)), "exams", onChange, onError));
      unsubs.push(
        onSnapshot(
          query(collection(fb.db, "notices"), where("sectionId", "==", sectionId)),
          (snap) => {
            noticeParts.set("section", snap.docs.map((d) => stripSecrets({ id: d.id, ...d.data() })) as Notice[]);
            publishNotices();
          },
          (err) => onError(err.message),
        ),
      );
    }
    for (const key of ["fees", "attendance", "marks", "checkouts"] as const) {
      unsubs.push(listenQuery(query(collection(fb.db, key), where("studentId", "==", sid)), key, onChange, onError));
    }
    unsubs.push(
      onSnapshot(
        query(collection(fb.db, "notices"), where("studentId", "==", sid)),
        (snap) => {
          noticeParts.set("student", snap.docs.map((d) => stripSecrets({ id: d.id, ...d.data() })) as Notice[]);
          publishNotices();
        },
        (err) => onError(err.message),
      ),
    );
    unsubs.push(listenQuery(collection(fb.db, "books"), "books", onChange, onError));
    return () => unsubs.forEach((u) => u());
  }

  if (scope.role === "staff" && scope.staffId) {
    unsubs.push(
      onSnapshot(
        doc(fb.db, "staff", scope.staffId),
        (snap) => {
          const row = snap.exists() ? [stripSecrets({ id: snap.id, ...snap.data() })] : [];
          onChange("staff", row as AppState["staff"]);
        },
        (err) => onError(err.message),
      ),
    );
    unsubs.push(
      listenQuery(
        query(collection(fb.db, "timetable"), where("staffId", "==", scope.staffId)),
        "timetable",
        onChange,
        onError,
        (rows) => (rows as TimetableSlot[]).map(normalizeTimetableSlot) as AppState[CollectionKey],
      ),
    );
    const sectionIds = [...new Set([...(scope.sectionIds ?? []), scope.sectionId].filter(Boolean))] as string[];
    for (const sectionId of sectionIds) {
      unsubs.push(listenQuery(query(collection(fb.db, "students"), where("sectionId", "==", sectionId)), "students", onChange, onError));
      unsubs.push(listenQuery(query(collection(fb.db, "exams"), where("sectionId", "==", sectionId)), "exams", onChange, onError));
      unsubs.push(listenQuery(query(collection(fb.db, "attendance"), where("sectionId", "==", sectionId)), "attendance", onChange, onError));
    }
    unsubs.push(listenQuery(collection(fb.db, "notices"), "notices", onChange, onError));
    unsubs.push(listenQuery(collection(fb.db, "messages"), "messages", onChange, onError));
    if (scope.departmentId) {
      unsubs.push(
        listenQuery(query(collection(fb.db, "courses"), where("departmentId", "==", scope.departmentId)), "courses", onChange, onError),
      );
    }
    return () => unsubs.forEach((u) => u());
  }

  return () => unsubs.forEach((u) => u());
}

/** @deprecated Prefer hydrateFromCloud(scope) — kept for tests that mention scopedQuery. */
export function scopedQuery(key: CollectionKey, scope?: Scope) {
  const fb = getFirebase();
  if (!fb || !scope || scope.role === "admin") return "all";
  if (scope.role === "staff") {
    if (key === "users" || key === "auditLogs" || key === "feePlans" || key === "fees" || key === "routes") return "skip";
    return "all";
  }
  const sid = scope.studentId;
  if (!sid) return "skip";
  if (key === "users" || key === "auditLogs" || key === "feePlans") return "skip";
  if (key === "students") return "doc";
  if (key === "fees" || key === "attendance" || key === "marks" || key === "checkouts") {
    return query(collection(fb.db, key), where("studentId", "==", sid));
  }
  if (key === "timetable" || key === "exams") {
    if (!scope.sectionId) return "skip";
    return query(collection(fb.db, key), where("sectionId", "==", scope.sectionId));
  }
  if (key === "staff") return "skip";
  return "skip";
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

export async function loadUserProfile(uidValue: string, email: string): Promise<User | null> {
  const fb = getFirebase();
  if (!fb) return null;
  const byUid = await getDoc(doc(fb.db, "users", uidValue));
  if (byUid.exists()) return stripSecrets({ id: byUid.id, ...byUid.data() }) as User;
  return email ? null : null;
}
