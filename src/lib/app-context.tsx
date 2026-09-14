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
import type { AppState, AuditLog, Role, User } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import { loadState, persistState, readSession, saveSession, uid } from "@/lib/storage";
import { can, type ModuleKey } from "@/lib/rbac";

type AppContextValue = {
  ready: boolean;
  online: boolean;
  user: User | null;
  state: AppState;
  login: (email: string, password: string) => string | null;
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
    return () => {
      alive = false;
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
    (email: string, password: string) => {
      const found = state.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password && u.active,
      );
      if (!found) return "Email or password is wrong. Try a demo login below.";
      setUserId(found.id);
      saveSession(found.id);
      persist({
        ...state,
        auditLogs: [
          {
            id: uid("log"),
            at: new Date().toISOString(),
            actorId: found.id,
            actorName: found.name,
            action: "login",
            entity: "session",
            entityId: found.id,
            details: `${found.role} signed in.`,
            online: navigator.onLine,
          },
          ...state.auditLogs,
        ].slice(0, 500),
      });
      return null;
    },
    [persist, state],
  );

  const logout = useCallback(() => {
    if (user) log("logout", "session", user.id, `${user.role} signed out.`);
    setUserId(null);
    saveSession(null);
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
    () => ({ ready, online, user, state, login, logout, allowed, scopedStudentId, mutate, log }),
    [ready, online, user, state, login, logout, allowed, scopedStudentId, mutate, log],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
