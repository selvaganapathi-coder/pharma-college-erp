"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, CollectionKey, Role, User } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import {
  listenAll,
  loadState,
  makeAudit,
  persistLocal,
  purgeSampleFromCloud,
  readSession,
  removeRow,
  saveSession,
  uid,
  uploadPhoto,
  writeRow,
} from "@/lib/store";
import { can, type ModuleKey } from "@/lib/rbac";
import { firebaseSignIn, firebaseSignOut } from "@/lib/firebase";

type AppContextValue = {
  ready: boolean;
  online: boolean;
  user: User | null;
  state: AppState;
  firebaseNote: string | null;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  registerAdmin: (input: { name: string; email: string; password: string; phone: string }) => Promise<string | null>;
  logout: () => void;
  allowed: (module: ModuleKey, action?: "read" | "write") => boolean;
  scopedStudentId: () => string | undefined;
  save: <K extends CollectionKey>(key: K, row: AppState[K][number], details: string) => Promise<void>;
  remove: (key: CollectionKey, id: string, details: string) => Promise<void>;
  upload: (folder: string, id: string, file: File) => Promise<string>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [firebaseNote, setFirebaseNote] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    let alive = true;
    loadState().then((loaded) => {
      if (!alive) return;
      setState(loaded);
      setUserId(readSession());
      setReady(true);
    });
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsubLive = listenAll((key, rows) => {
      if (!alive || !rows.length) return;
      setState((prev) => {
        const next = { ...prev, [key]: rows };
        void persistLocal(next);
        return next;
      });
    });
    return () => {
      alive = false;
      unsubLive();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const user = state.users.find((u) => u.id === userId && u.active) ?? null;
  const needsSetup = ready && state.users.length === 0;

  const audit = useCallback(
    async (action: string, entity: string, entityId: string, details: string) => {
      const entry = makeAudit(user?.id ?? "system", user?.name ?? "System", action, entity, entityId, details);
      setState((prev) => {
        const next = { ...prev, auditLogs: [entry, ...prev.auditLogs].slice(0, 800) };
        void persistLocal(next);
        return next;
      });
      await writeRow("auditLogs", entry);
    },
    [user],
  );

  const save = useCallback(
    async <K extends CollectionKey>(key: K, row: AppState[K][number], details: string) => {
      const item = row as AppState[K][number] & { id: string };
      setState((prev) => {
        const list = prev[key] as { id: string }[];
        const exists = list.some((r) => r.id === item.id);
        const rows = (exists ? list.map((r) => (r.id === item.id ? item : r)) : [item, ...list]) as AppState[K];
        const next = { ...prev, [key]: rows };
        void persistLocal(next);
        return next;
      });
      await writeRow(key, item);
      await audit("save", key, item.id, details);
    },
    [audit],
  );

  const remove = useCallback(
    async (key: CollectionKey, id: string, details: string) => {
      setState((prev) => {
        const rows = (prev[key] as { id: string }[]).filter((r) => r.id !== id);
        const next = { ...prev, [key]: rows };
        void persistLocal(next);
        return next;
      });
      await removeRow(key, id);
      await audit("delete", key, id, details);
    },
    [audit],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const found = state.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.active,
      );
      if (!found) return "Email or password is wrong.";
      const fb = await firebaseSignIn(found.email, password);
      setFirebaseNote(fb.note);
      setUserId(found.id);
      saveSession(found.id);
      if (fb.ok) await purgeSampleFromCloud();
      await audit("login", "session", found.id, `${found.role} signed in.`);
      return null;
    },
    [audit, state.users],
  );

  const registerAdmin = useCallback(
    async (input: { name: string; email: string; password: string; phone: string }) => {
      if (state.users.length > 0) return "An admin already exists. Please sign in.";
      if (!input.name.trim() || !input.email.trim() || input.password.length < 8) {
        return "Enter your name, email, and a password of at least 8 characters.";
      }
      const account: User = {
        id: uid("u"),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        name: input.name.trim(),
        role: "admin",
        phone: input.phone.trim(),
        active: true,
      };
      const fb = await firebaseSignIn(account.email, account.password);
      setFirebaseNote(fb.note);
      setState((prev) => {
        const next = { ...prev, users: [account, ...prev.users] };
        void persistLocal(next);
        return next;
      });
      await writeRow("users", account);
      setUserId(account.id);
      saveSession(account.id);
      if (fb.ok) await purgeSampleFromCloud();
      return null;
    },
    [state.users.length],
  );

  const logout = useCallback(() => {
    if (user) void audit("logout", "session", user.id, `${user.role} signed out.`);
    void firebaseSignOut();
    setUserId(null);
    saveSession(null);
    setFirebaseNote(null);
  }, [audit, user]);

  const allowed = useCallback(
    (module: ModuleKey, action: "read" | "write" = "read") => {
      if (!user) return false;
      return can(user.role as Role, module, action);
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

  const value = useMemo(
    () => ({
      ready,
      online,
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
      upload,
    }),
    [
      ready,
      online,
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
      upload,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
