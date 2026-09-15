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
import { onAuthStateChanged } from "firebase/auth";
import type { AppState, AuditLog, Role, User } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import { loadState, persistState, pullCloudState, readSession, saveSession, uid } from "@/lib/storage";
import { can, type ModuleKey } from "@/lib/rbac";
import { firebaseSignIn, firebaseSignOut, getFirebase } from "@/lib/firebase";

type AppContextValue = {
  ready: boolean;
  online: boolean;
  user: User | null;
  state: AppState;
  login: (email: string, password: string) => Promise<string | null>;
  firebaseNote: string | null;
  logout: () => void;
  allowed: (module: ModuleKey, action?: "read" | "write") => boolean;
  scopedStudentId: () => string | undefined;
  mutate: (writer: (draft: AppState) => string, entity: string, entityId: string) => void;
  log: (action: string, entity: string, entityId: string, details: string) => void;
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
    const fb = getFirebase();
    const unsub = fb
      ? onAuthStateChanged(fb.auth, async (fbUser) => {
          if (!alive || !fbUser) return;
          const remote = await pullCloudState();
          if (remote && alive) {
            setState(remote);
            const match = remote.users.find(
              (u) => u.email.toLowerCase() === fbUser.email?.toLowerCase() && u.active,
            );
            if (match) {
              setUserId(match.id);
              saveSession(match.id);
            }
          }
        })
      : undefined;
    return () => {
      alive = false;
      unsub?.();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const user = state.users.find((u) => u.id === userId && u.active) ?? null;

  const persist = useCallback((next: AppState) => {
    setState(next);
    void persistState(next);
  }, []);

  const log = useCallback(
    (action: string, entity: string, entityId: string, details: string) => {
      setState((prev) => {
        const entry: AuditLog = {
          id: uid("log"),
          at: new Date().toISOString(),
          actorId: user?.id ?? "system",
          actorName: user?.name ?? "System",
          action,
          entity,
          entityId,
          details,
          online: navigator.onLine,
        };
        const next = { ...prev, auditLogs: [entry, ...prev.auditLogs].slice(0, 500) };
        void persistState(next);
        return next;
      });
    },
    [user],
  );

  const mutate = useCallback(
    (writer: (draft: AppState) => string, entity: string, entityId: string) => {
      setState((prev) => {
        const draft = structuredClone(prev);
        const details = writer(draft);
        const entry: AuditLog = {
          id: uid("log"),
          at: new Date().toISOString(),
          actorId: user?.id ?? "system",
          actorName: user?.name ?? "System",
          action: "update",
          entity,
          entityId,
          details,
          online: navigator.onLine,
        };
        draft.auditLogs = [entry, ...draft.auditLogs].slice(0, 500);
        void persistState(draft);
        return draft;
      });
    },
    [user],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const found = state.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.active,
      );
      if (!found) return "Email or password is wrong. Try a demo login below.";
      const fb = await firebaseSignIn(found.email, password);
      setFirebaseNote(fb.note);
      const remote = fb.ok ? await pullCloudState() : null;
      const base = remote ?? state;
      const account =
        base.users.find((u) => u.email.toLowerCase() === found.email.toLowerCase() && u.active) ?? found;
      setUserId(account.id);
      saveSession(account.id);
      persist({
        ...base,
        auditLogs: [
          {
            id: uid("log"),
            at: new Date().toISOString(),
            actorId: account.id,
            actorName: account.name,
            action: "login",
            entity: "session",
            entityId: account.id,
            details: `${account.role} signed in. ${fb.note}`,
            online: navigator.onLine,
          },
          ...base.auditLogs,
        ].slice(0, 500),
      });
      return null;
    },
    [persist, state],
  );

  const logout = useCallback(() => {
    if (user) log("logout", "session", user.id, `${user.role} signed out.`);
    void firebaseSignOut();
    setUserId(null);
    saveSession(null);
    setFirebaseNote(null);
  }, [log, user]);

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

  const value = useMemo(
    () => ({
      ready,
      online,
      user,
      state,
      login,
      logout,
      allowed,
      scopedStudentId,
      mutate,
      log,
      firebaseNote,
    }),
    [ready, online, user, state, login, logout, allowed, scopedStudentId, mutate, log, firebaseNote],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
