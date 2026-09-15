import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function firebaseProjectId() {
  return firebaseConfig.projectId;
}

let bundle: FirebaseBundle | null = null;

export function getFirebase(): FirebaseBundle | null {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (bundle) return bundle;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  bundle = { app, auth: getAuth(app), db: getFirestore(app) };
  return bundle;
}

export async function firebaseSignIn(email: string, password: string) {
  const fb = getFirebase();
  if (!fb) return { ok: true, mode: "local" as const, note: "Firebase is off." };

  try {
    await signInWithEmailAndPassword(fb.auth, email, password);
    return { ok: true, mode: "signed-in" as const, note: "Signed in with Firebase." };
  } catch (first) {
    const code = errorCode(first);
    if (code === "auth/operation-not-allowed") {
      return {
        ok: false,
        mode: "local" as const,
        note: "Turn on Email/Password in Firebase Authentication, then sign in again.",
      };
    }
    if (
      code !== "auth/user-not-found" &&
      code !== "auth/invalid-credential" &&
      code !== "auth/invalid-login-credentials" &&
      code !== "auth/wrong-password"
    ) {
      return {
        ok: false,
        mode: "local" as const,
        note: firebaseMessage(first),
      };
    }

    try {
      await createUserWithEmailAndPassword(fb.auth, email, password);
      return { ok: true, mode: "created" as const, note: "Firebase login created for this email." };
    } catch (second) {
      const code2 = errorCode(second);
      if (code2 === "auth/email-already-in-use") {
        try {
          await signInWithEmailAndPassword(fb.auth, email, password);
          return { ok: true, mode: "signed-in" as const, note: "Signed in with Firebase." };
        } catch (third) {
          return { ok: false, mode: "local" as const, note: firebaseMessage(third) };
        }
      }
      if (code2 === "auth/operation-not-allowed") {
        return {
          ok: false,
          mode: "local" as const,
          note: "Turn on Email/Password in Firebase Authentication, then sign in again.",
        };
      }
      return { ok: false, mode: "local" as const, note: firebaseMessage(second) };
    }
  }
}

export async function firebaseSignOut() {
  const fb = getFirebase();
  if (!fb) return;
  try {
    await signOut(fb.auth);
  } catch {
    // Local sign-out still happens.
  }
}

function errorCode(err: unknown) {
  if (err && typeof err === "object" && "code" in err) return String((err as { code: string }).code);
  return "";
}

function firebaseMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: string }).message);
  return "Firebase login failed.";
}
