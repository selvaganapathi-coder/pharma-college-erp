"use client";

import { openDB, type IDBPDatabase } from "idb";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { AppState } from "./types";
import { makeSeed } from "./seed";
import { getFirebase, isFirebaseConfigured } from "./firebase";

const DB_NAME = "gp-pharmacy-erp";
const STORE = "kv";
const STATE_KEY = "app-state";
const SESSION_KEY = "gp-session-user-id";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function loadState(): Promise<AppState> {
  const local = await (await db()).get(STORE, STATE_KEY);
  if (local) return local as AppState;
  const seed = makeSeed();
  await persistLocal(seed);
  return seed;
}

export async function pullCloudState(): Promise<AppState | null> {
  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(firebase.db, "erp", "state"));
    if (!snap.exists()) return null;
    const remote = snap.data() as AppState;
    await persistLocal(remote);
    return remote;
  } catch {
    return null;
  }
}

export async function persistState(state: AppState) {
  const clean = JSON.parse(JSON.stringify(state)) as AppState;
  await persistLocal(clean);
  if (!navigator.onLine || !isFirebaseConfigured()) return;
  const firebase = getFirebase();
  if (!firebase?.auth.currentUser) return;
  try {
    await setDoc(doc(firebase.db, "erp", "state"), clean);
  } catch {
    // Local save already succeeded. Sync will retry after the next signed-in write.
  }
}

async function persistLocal(state: AppState) {
  await (await db()).put(STORE, state, STATE_KEY);
}

export function saveSession(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId);
  else localStorage.removeItem(SESSION_KEY);
}

export function readSession() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
