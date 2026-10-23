"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "sonner";
import type { AppState, CollectionKey, Role, User } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import {
  deleteRow,
  flushOutbox,
  listenAll,
  loadState,
  loadUserProfile,
  makeAudit,
  persistLocal,
  saveSession,
  setDataOwner,
  uploadPhoto,
  wipeOwnerData,
  writeRow,
  type SyncStatus,
  type WriteResult,
} from "@/lib/store";
import { can, type ModuleKey } from "@/lib/rbac";
import { scopeFromProfile, staffTeaching, type DataScope } from "@/lib/scope";
import { normalizeTimetableSlot } from "@/lib/schedule";
import {
  currentIdToken,
  firebaseLogin,
  firebaseSignOut,
  getFirebase,
  provisionPortalAuth,
  setupDocExists,
} from "@/lib/firebase";
import { profileGate, signInAndOpen, withTimeout } from "@/lib/session-gate";

type AppContextValue = {
  ready: boolean;
  online: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  user: User | null;
  state: AppState;
  firebaseNote: string | null;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null; role?: Role }>;
  registerAdmin: (input: { name: string; email: string; password: string; phone: string }) => Promise<string | null>;
  logout: () => void;
  allowed: (module: ModuleKey, action?: "read" | "write") => boolean;
  scopedStudentId: () => string | undefined;
  save: <K extends CollectionKey>(key: K, row: AppState[K][number], details: string) => Promise<WriteResult>;
  remove: (key: CollectionKey, id: string, details: string) => Promise<void>;
  archive: <K extends CollectionKey>(key: K, row: AppState[K][number] & { deletedAt?: string }, details: string) => Promise<void>;
  upload: (folder: string, id: string, file: File) => Promise<string>;
  createPortalLogin: (input: { email: string; password: string; name: string; role: Role; phone: string; studentId?: string; staffId?: string; childStudentId?: string }) => Promise<string | null>;
  createStudent: (input: {
    student: AppState["students"][number];
    createLogin: boolean;
    password?: string;
    createParentLogin: boolean;
    parentPassword?: string;
  }) => Promise<string | null>;
  authHeader: () => Promise<HeadersInit>;
};

const AppContext = createContext<AppContextValue | null>(null);

function buildScope(profile: User, data?: Pick<AppState, "students" | "staff" | "timetable" | "exams">): DataScope {
  const extras: { sectionId?: string; departmentId?: string; subjectIds?: string[]; sectionIds?: string[] } = {};
  if (profile.role === "student" || profile.role === "parent") {
    const sid = profile.role === "student" ? profile.studentId : profile.childStudentId ?? profile.studentIds?.[0];
    const student = data?.students.find((s) => s.id === sid);
    extras.sectionId = student?.sectionId;
    extras.departmentId = student?.departmentId;
  }
  if (profile.role === "staff") {
    extras.departmentId = data?.staff.find((t) => t.id === profile.staffId)?.departmentId;
    extras.sectionIds = staffTeaching(data ?? { students: [], staff: [], timetable: [], exams: [] }, profile.staffId).sectionIds;
    extras.subjectIds = staffTeaching(data ?? { students: [], staff: [], timetable: [], exams: [] }, profile.staffId).subjectIds;
  }
  return { ...scopeFromProfile(profile), ...extras, staffId: profile.staffId };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [firebaseNote, setFirebaseNote] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [setupLocked, setSetupLocked] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const syncStarter = useRef<(profile: User) => void>(() => undefined);
  const cancelSync = useRef<() => void>(() => undefined);

  useEffect(() => {
    let alive = true;
    let unsubLive: () => void = () => undefined;
    let unsubAuth: () => void = () => undefined;
    const on = () => setOnline(true);
    const off = () => {
      setOnline(false);
      setSyncStatus("offline");
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    function attachLive(profile: User | null, data?: AppState) {
      unsubLive();
      const scope = profile ? buildScope(profile, data) : undefined;
      unsubLive = listenAll(
        (key, rows) => {
          if (!alive) return;
          setState((prev) => {
            const next = { ...prev, [key]: rows };
            void persistLocal(next);
            return next;
          });
          setSyncStatus("synced");
          setLastSyncedAt(new Date().toISOString());
          setSyncError(null);
        },
        (message) => {
          const note = /permission/i.test(message)
            ? "The college cloud refused this read. Publish firestore.rules from this repository, then sign in again."
            : message;
          setSyncStatus("error");
          setSyncError(note);
        },
        scope,
      );
    }

    let listeningFor: string | null = null;
    let generation = 0;
    cancelSync.current = () => {
      generation += 1;
      listeningFor = null;
      unsubLive();
    };

    function startCloudSync(profile: User) {
      if (listeningFor === profile.id) return;
      unsubLive();
      generation += 1;
      const gen = generation;
      listeningFor = profile.id;
      void (async () => {
        const isolated = profile.role === "student" || profile.role === "parent" || profile.role === "staff";
        let local = EMPTY_STATE;
        if (!isolated) {
          try {
            local = await withTimeout(loadState(profile.id), 2000, "Saved data on this device took too long to open.");
          } catch {
            local = EMPTY_STATE;
          }
        }
        if (!alive || gen !== generation) return;
        setState((prev) => {
          const base = isolated ? { ...EMPTY_STATE, users: [profile] } : local;
          const users = base.users.some((u) => u.id === profile.id) ? base.users : [profile, ...base.users];
          return { ...base, users };
        });
        void persistLocal(isolated ? { ...EMPTY_STATE, users: [profile] } : { ...local, users: local.users.some((u) => u.id === profile.id) ? local.users : [profile, ...local.users] }, profile.id);
        if (!alive || gen !== generation) return;
        attachLive(profile, isolated ? { ...EMPTY_STATE, users: [profile] } : local);
        const flush = await flushOutbox();
        if (!alive || gen !== generation) return;
        if (!flush.ok && flush.error) {
          setSyncStatus("error");
          setSyncError(flush.error);
        }
        if (profile.role === "admin") void fetch("/api/setup").catch(() => undefined);
      })().catch((err) => {
        if (!alive || gen !== generation) return;
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "Cloud sync failed.");
      });
    }
    syncStarter.current = startCloudSync;

    async function sessionFromAuth() {
      const fbUser = getFirebase()?.auth.currentUser;
      if (!fbUser) return null;
      if (listeningFor === fbUser.uid) return null;
      let profile: User | null;
      try {
        profile = await withTimeout(
          loadUserProfile(fbUser.uid, fbUser.email ?? ""),
          8000,
          "Could not load your college profile in time. Check your connection and try again.",
        );
      } catch (err) {
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "Could not load your college profile.");
        return null;
      }
      const gate = profileGate(profile);
      if (!gate.ok || !profile || !alive) return null;
      setDataOwner(profile.id);
      setUserId(profile.id);
      saveSession(profile.id);
      setState((prev) => (prev.users.some((u) => u.id === profile!.id) ? prev : { ...prev, users: [profile!, ...prev.users] }));
      setSyncStatus("syncing");
      startCloudSync(profile);
      return profile;
    }

    void (async () => {
      try {
        if (!alive) return;
        setState(EMPTY_STATE);
        setUserId(null);
        const fb = getFirebase();
        if (!fb) {
          setSyncStatus("offline");
          setReady(true);
          return;
        }
        await withTimeout(fb.auth.authStateReady(), 4000, "Signed-in session took too long to restore.").catch(() => undefined);
        if (!alive) return;
        if (fb.auth.currentUser) await sessionFromAuth();
        unsubAuth = onAuthStateChanged(fb.auth, (fbUser) => {
          if (!alive) return;
          if (!fbUser) {
            cancelSync.current();
            return;
          }
          void sessionFromAuth();
        });
        void setupDocExists().then((locked) => {
          if (alive) setSetupLocked(locked);
        });
      } finally {
        if (alive) setReady(true);
      }
    })();

    return () => {
      alive = false;
      unsubLive();
      unsubAuth();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const user = state.users.find((u) => u.id === userId && u.active) ?? null;
  const needsSetup = ready && !setupLocked && state.users.filter((u) => u.role === "admin" && u.active).length === 0;

  const audit = useCallback(
    async (action: string, entity: string, entityId: string, details: string) => {
      const actor = getFirebase()?.auth.currentUser?.uid ?? user?.id ?? "unknown";
      const entry = makeAudit(actor, user?.name ?? "System", action, entity, entityId, details);
      setState((prev) => {
        const next = { ...prev, auditLogs: [entry, ...prev.auditLogs].slice(0, 800) };
        void persistLocal(next);
        return next;
      });
      const result = await writeRow("auditLogs", entry);
      if (!result.ok && result.error) setSyncError(result.error);
    },
    [user],
  );

  const save = useCallback(
    async <K extends CollectionKey>(key: K, row: AppState[K][number], details: string): Promise<WriteResult> => {
      const item = (key === "timetable" ? normalizeTimetableSlot(row as AppState["timetable"][number]) : row) as AppState[K][number] & { id: string };
      setState((prev) => {
        const list = prev[key] as { id: string }[];
        const exists = list.some((r) => r.id === item.id);
        const rows = (exists ? list.map((r) => (r.id === item.id ? item : r)) : [item, ...list]) as AppState[K];
        const next = { ...prev, [key]: rows };
        void persistLocal(next);
        return next;
      });
      const result = await writeRow(key, item);
      if (!result.ok) {
        setSyncStatus(result.queued ? "syncing" : "error");
        setSyncError(result.error ?? "Save did not reach the cloud.");
        toast.error(result.error ?? "Save did not reach the cloud.");
        return result;
      }
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
      setSyncError(null);
      await audit("save", key, item.id, details);
      return result;
    },
    [audit],
  );

  const archive = useCallback(
    async <K extends CollectionKey>(key: K, row: AppState[K][number] & { deletedAt?: string }, details: string) => {
      const updated = { ...row, deletedAt: new Date().toISOString() } as AppState[K][number];
      await save(key, updated, details);
    },
    [save],
  );

  const remove = useCallback(
    async (key: CollectionKey, id: string, details: string) => {
      const list = state[key] as { id: string }[];
      const row = list.find((r) => r.id === id);
      if (!row) return;
      if (key === "students" || key === "staff" || key === "books" || key === "fees") {
        await archive(key, row as AppState[typeof key][number] & { deletedAt?: string }, details);
        return;
      }
      if (key === "timetable" || key === "messages") {
        setState((prev) => {
          const rows = (prev[key] as { id: string }[]).filter((r) => r.id !== id) as AppState[typeof key];
          const next = { ...prev, [key]: rows };
          void persistLocal(next);
          return next;
        });
        const result = await deleteRow(key, id);
        if (!result.ok) {
          setSyncStatus(result.queued ? "syncing" : "error");
          setSyncError(result.error ?? "Remove did not reach the cloud.");
          toast.error(result.error ?? "Remove did not reach the cloud.");
          return;
        }
        setSyncStatus("synced");
        await audit("delete", key, id, details);
        return;
      }
      toast.error("This record cannot be hard-deleted from the browser. Archive it instead.");
      await audit("delete-blocked", key, id, details);
    },
    [archive, audit, state],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const address = email.trim().toLowerCase();
      const result = await signInAndOpen({
        signIn: async () => {
          const fb = await firebaseLogin(address, password);
          setFirebaseNote(fb.note);
          return fb;
        },
        loadProfile: async () => {
          const uidAuth = getFirebase()?.auth.currentUser?.uid;
          if (!uidAuth) return null;
          return loadUserProfile(uidAuth, address);
        },
        onReady: (profile) => {
          setDataOwner(profile.id);
          setUserId(profile.id);
          saveSession(profile.id);
          setState((prev) => (prev.users.some((u) => u.id === profile.id) ? prev : { ...prev, users: [profile, ...prev.users] }));
          setSyncStatus("syncing");
          syncStarter.current(profile);
        },
      });
      if (result.error) {
        if (getFirebase()?.auth.currentUser) await firebaseSignOut();
        return { error: result.error };
      }
      const profileId = getFirebase()?.auth.currentUser?.uid;
      if (profileId) void audit("login", "session", profileId, `${result.role} signed in.`);
      return { error: null, role: result.role };
    },
    [audit],
  );

  const registerAdmin = useCallback(
    async (input: { name: string; email: string; password: string; phone: string }) => {
      if (!input.name.trim() || !input.email.trim() || input.password.length < 8) {
        return "Enter your name, email, and a password of at least 8 characters.";
      }
      if (await setupDocExists()) return "An administrator already exists. Please sign in.";
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          password: input.password,
          phone: input.phone.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; note?: string };
      if (!res.ok || !data.ok) return data.note ?? "Could not create the administrator.";
      const signed = await login(input.email, input.password);
      if (signed.error) return `Administrator created. ${signed.error}`;
      setSetupLocked(true);
      return null;
    },
    [login],
  );

  const logout = useCallback(() => {
    const id = user?.id;
    if (user) void audit("logout", "session", user.id, `${user.role} signed out.`);
    cancelSync.current();
    void firebaseSignOut();
    setUserId(null);
    setState(EMPTY_STATE);
    saveSession(null);
    setFirebaseNote(null);
    setDataOwner(null);
    if (id) void wipeOwnerData(id);
  }, [audit, user]);

  const createPortalLogin = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      role: Role;
      phone: string;
      studentId?: string;
      staffId?: string;
      childStudentId?: string;
    }) => {
      if (!user || user.role !== "admin") return "Only an administrator can create portal logins.";
      if (input.role === "admin") return "Cannot create another administrator from the browser.";
      if (input.password.length < 8) return "Portal password must be at least 8 characters.";
      const made = await provisionPortalAuth(input.email.trim().toLowerCase(), input.password);
      if (!made.ok || !made.uid) return made.note;
      const profile: User = {
        id: made.uid,
        uid: made.uid,
        email: input.email.trim().toLowerCase(),
        name: input.name,
        role: input.role,
        phone: input.phone,
        active: true,
        studentId: input.studentId,
        staffId: input.staffId,
        childStudentId: input.childStudentId,
      };
      const saved = await save("users", profile, `Created ${input.role} portal for ${profile.email}.`);
      if (!saved.ok) return saved.error ?? "Firebase login was created but the college profile was not saved. Try again.";
      return null;
    },
    [save, user],
  );

  const createStudent = useCallback(
    async (input: {
      student: AppState["students"][number];
      createLogin: boolean;
      password?: string;
      createParentLogin: boolean;
      parentPassword?: string;
    }) => {
      if (!user || user.role !== "admin") return "Only an administrator can admit students.";
      const token = await currentIdToken();
      if (token) {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            student: input.student,
            createLogin: input.createLogin,
            password: input.createLogin ? input.password : undefined,
            createParentLogin: input.createParentLogin,
            parentPassword: input.createParentLogin ? input.parentPassword : undefined,
          }),
        });
        const data = (await res.json()) as { ok?: boolean; note?: string; student?: AppState["students"][number] };
        if (!data.ok || !data.student) return data.note ?? "Student was not created.";
        setState((prev) => {
          const exists = prev.students.some((s) => s.id === data.student!.id);
          const students = exists
            ? prev.students.map((s) => (s.id === data.student!.id ? data.student! : s))
            : [data.student!, ...prev.students];
          const next = { ...prev, students };
          void persistLocal(next);
          return next;
        });
        await audit("save", "students", data.student.id, `Saved student ${data.student.name} (${data.student.rollNo}).`);
        return null;
      }
      if (input.createLogin || input.createParentLogin) {
        return "Sign in to the college cloud to create a student or parent login.";
      }
      const saved = await save("students", input.student, `Saved student ${input.student.name} (${input.student.rollNo}).`);
      if (!saved.ok) return saved.error ?? "Student was not saved.";
      return null;
    },
    [audit, save, user],
  );

  const allowed = useCallback(
    (module: ModuleKey, action: "read" | "write" = "read") => {
      if (!user) return false;
      return can(user.role, module, action);
    },
    [user],
  );

  const scopedStudentId = useCallback(() => {
    if (!user) return undefined;
    if (user.role === "student") return user.studentId;
    if (user.role === "parent") return user.childStudentId;
    return undefined;
  }, [user]);

  const upload = useCallback((folder: string, id: string, file: File) => uploadPhoto(folder, id, file), []);

  const authHeader = useCallback(async () => {
    const token = await currentIdToken();
    return (token ? { Authorization: `Bearer ${token}` } : {}) as HeadersInit;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      online,
      syncStatus,
      lastSyncedAt,
      syncError,
      user,
      state,
      firebaseNote,
      needsSetup,
      login,
      registerAdmin,
      logout,
      allowed,
      scopedStudentId,
      save,
      remove,
      archive,
      upload,
      createPortalLogin,
      createStudent,
      authHeader,
    }),
    [
      ready,
      online,
      syncStatus,
      lastSyncedAt,
      syncError,
      user,
      state,
      firebaseNote,
      needsSetup,
      login,
      registerAdmin,
      logout,
      allowed,
      scopedStudentId,
      save,
      remove,
      archive,
      upload,
      createPortalLogin,
      createStudent,
      authHeader,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
