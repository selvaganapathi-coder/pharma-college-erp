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
import type { AppState, CollectionKey, Role, User } from "@/lib/types";
import { EMPTY_STATE } from "@/lib/types";
import {
  hydrateFromCloud,
  listenAll,
  loadState,
  makeAudit,
  mergeCloud,
  persistLocal,
  purgeSampleFromCloud,
  pushMissingToCloud,
  readSession,
  removeRow,
  saveSession,
  uid,
  uploadPhoto,
  writeRow,
} from "@/lib/store";
import { can, type ModuleKey } from "@/lib/rbac";
import { firebaseSignIn, firebaseSignOut, getFirebase } from "@/lib/firebase";

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
    let unsubLive: () => void = () => undefined;
    let unsubAuth: () => void = () => undefined;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    function attachLive() {
      unsubLive();
      unsubLive = listenAll((key, rows) => {
        if (!alive || !rows.length) return;
        setState((prev) => {
          const next = { ...prev, [key]: rows };
          void persistLocal(next);
          return next;
        });
      });
    }

    async function applyCloud(local: AppState) {
      const fb = getFirebase();
      const cloud = await hydrateFromCloud();
      if (!alive) return local;
      let merged = cloud ? mergeCloud(local, cloud) : local;
      const email = fb?.auth.currentUser?.email?.toLowerCase();
      if (email && !merged.users.some((u) => u.email.toLowerCase() === email)) {
        const account: User = {
          id: uid("u"),
          email,
          password: "",
          name: email.split("@")[0],
          role: merged.users.length === 0 ? "admin" : "staff",
          phone: "",
          active: true,
          uid: fb?.auth.currentUser?.uid,
        };
        merged = { ...merged, users: [account, ...merged.users] };
        await writeRow("users", account);
      }
      setState(merged);
      void persistLocal(merged);
      const match = email ? merged.users.find((u) => u.email.toLowerCase() === email && u.active) : undefined;
      if (match) {
        setUserId(match.id);
        saveSession(match.id);
      }
      await pushMissingToCloud(merged);
      return merged;
    }

    void (async () => {
      try {
        const loaded = await loadState();
        if (!alive) return;
        setState(loaded);
        setUserId(readSession());

        const fb = getFirebase();
        if (!fb) {
          setReady(true);
          return;
        }
        await fb.auth.authStateReady();
        if (!alive) return;
        if (fb.auth.currentUser) {
          await applyCloud(loaded);
          attachLive();
        }
        unsubAuth = onAuthStateChanged(fb.auth, (fbUser) => {
          if (!alive || !fbUser) return;
          void loadState()
            .then((local) => applyCloud(local))
            .then(() => attachLive());
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
      const address = email.trim().toLowerCase();
      const fb = await firebaseSignIn(address, password);
      setFirebaseNote(fb.note);
      const signedIn = Boolean(getFirebase()?.auth.currentUser);

      let users = state.users;
      if (signedIn) {
        const cloud = await hydrateFromCloud();
        if (cloud) {
          const merged = mergeCloud(state, cloud);
          setState(merged);
          void persistLocal(merged);
          users = merged.users;
          await pushMissingToCloud(merged);
        }
      }

      let found = users.find((u) => u.email.toLowerCase() === address && u.active) ?? null;
      if (found && !signedIn && found.password !== password) {
        return "Email or password is wrong.";
      }
      if (!found && signedIn) {
        found = {
          id: uid("u"),
          email: address,
          password,
          name: address.split("@")[0],
          role: users.length === 0 ? "admin" : "staff",
          phone: "",
          active: true,
          uid: getFirebase()?.auth.currentUser?.uid,
        };
        setState((prev) => {
          const next = { ...prev, users: [found!, ...prev.users] };
          void persistLocal(next);
          return next;
        });
        await writeRow("users", found);
      }
      if (!found) {
        found =
          state.users.find((u) => u.email.toLowerCase() === address && u.password === password && u.active) ?? null;
      }
      if (!found) return "Email or password is wrong.";
      if (signedIn && password && found.password !== password) {
        found = { ...found, password };
        setState((prev) => {
          const next = { ...prev, users: prev.users.map((u) => (u.id === found!.id ? found! : u)) };
          void persistLocal(next);
          return next;
        });
        await writeRow("users", found);
      }
      setUserId(found.id);
      saveSession(found.id);
      if (fb.ok) await purgeSampleFromCloud();
      await audit("login", "session", found.id, `${found.role} signed in.`);
      return null;
    },
    [audit, state],
  );

  const registerAdmin = useCallback(
    async (input: { name: string; email: string; password: string; phone: string }) => {
      if (!input.name.trim() || !input.email.trim() || input.password.length < 8) {
        return "Enter your name, email, and a password of at least 8 characters.";
      }
      const address = input.email.trim().toLowerCase();
      const fb = await firebaseSignIn(address, input.password);
      setFirebaseNote(fb.note);

      if (getFirebase()?.auth.currentUser) {
        const cloud = await hydrateFromCloud();
        if (cloud?.users && cloud.users.length > 0) {
          const merged = mergeCloud(state, cloud);
          setState(merged);
          void persistLocal(merged);
          const existing = merged.users.find((u) => u.email.toLowerCase() === address && u.active);
          if (existing) {
            setUserId(existing.id);
            saveSession(existing.id);
            return null;
          }
          return "An admin already exists. Please sign in with that email.";
        }
      }

      if (state.users.length > 0) return "An admin already exists. Please sign in.";

      const account: User = {
        id: uid("u"),
        email: address,
        password: input.password,
        name: input.name.trim(),
        role: "admin",
        phone: input.phone.trim(),
        active: true,
        uid: getFirebase()?.auth.currentUser?.uid,
      };
      setState((prev) => {
        const next = { ...prev, users: [account, ...prev.users] };
        void persistLocal(next);
        return next;
      });
      await writeRow("users", account);
      setUserId(account.id);
      saveSession(account.id);
      if (fb.ok) await purgeSampleFromCloud();
      if (!getFirebase()?.auth.currentUser) {
        setFirebaseNote(
          "Admin is saved on this browser only. Turn on Email/Password in Firebase Auth and add this site to Authorized domains so the account is kept.",
        );
      }
      return null;
    },
    [state],
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
