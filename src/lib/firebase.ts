import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { doc, getDoc, setDoc, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig } from "./firebase-config";

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function firebaseProjectId() {
  return firebaseConfig.projectId;
}

let bundle: FirebaseBundle | null = null;
let provision: FirebaseBundle | null = null;

export function getFirebase(): FirebaseBundle | null {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (bundle) return bundle;
  const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
  bundle = { app, auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
  return bundle;
}

function getProvision(): FirebaseBundle | null {
  if (!isFirebaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (provision) return provision;
  const app = getApps().find((a) => a.name === "provision") ?? initializeApp(firebaseConfig, "provision");
  provision = { app, auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
  return provision;
}

export function authErrorCode(err: unknown) {
  if (err && typeof err === "object" && "code" in err) return String((err as { code: string }).code);
  return "";
}

export function firebaseMessage(err: unknown) {
  const code = authErrorCode(err);
  if (code === "auth/invalid-credential" || code === "auth/invalid-login-credentials" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password is wrong.";
  }
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a few minutes, then try again.";
  if (code === "auth/operation-not-allowed") return "Turn on Email/Password in Firebase Authentication.";
  if (code === "auth/unauthorized-domain") return "Add this site to Firebase Authentication authorized domains.";
  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in instead.";
  if (err && typeof err === "object" && "message" in err) return String((err as { message: string }).message);
  return "Firebase login failed.";
}

/** Login only. Never creates an account. */
export async function firebaseLogin(email: string, password: string) {
  const fb = getFirebase();
  if (!fb) return { ok: false as const, note: "Firebase is not configured on this device." };
  try {
    await signInWithEmailAndPassword(fb.auth, email, password);
    return { ok: true as const, note: "Signed in. Live cloud save is on." };
  } catch (err) {
    return { ok: false as const, note: firebaseMessage(err) };
  }
}

export async function firebaseRegister(email: string, password: string) {
  const fb = getFirebase();
  if (!fb) return { ok: false as const, note: "Firebase is not configured. Admin cannot be created in the cloud." };
  try {
    await createUserWithEmailAndPassword(fb.auth, email, password);
    return { ok: true as const, note: "Cloud admin login created." };
  } catch (err) {
    return { ok: false as const, note: firebaseMessage(err) };
  }
}

/** Create a portal Auth user without replacing the signed-in admin session. */
export async function provisionPortalAuth(email: string, password: string) {
  const p = getProvision();
  if (!p) return { ok: false as const, uid: null as string | null, note: "Firebase is not configured." };
  try {
    const cred = await createUserWithEmailAndPassword(p.auth, email, password);
    const uid = cred.user.uid;
    await signOut(p.auth);
    return { ok: true as const, uid, note: "Portal login created." };
  } catch (err) {
    return { ok: false as const, uid: null as string | null, note: firebaseMessage(err) };
  }
}

export async function setupDocExists() {
  const fb = getFirebase();
  if (!fb) return false;
  try {
    const snap = await getDoc(doc(fb.db, "meta", "setup"));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function writeSetupLock(adminUid: string) {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) throw new Error("Not signed in.");
  await setDoc(doc(fb.db, "meta", "setup"), {
    adminUid,
    at: new Date().toISOString(),
  });
}

export async function firebaseResetPassword(email: string) {
  const fb = getFirebase();
  if (!fb) return { ok: false as const, note: "Firebase is not configured on this device." };
  try {
    await sendPasswordResetEmail(fb.auth, email);
    return { ok: true as const, note: "If that email has a login, a reset message is on its way." };
  } catch (err) {
    return { ok: false as const, note: firebaseMessage(err) };
  }
}

export async function firebaseSignOut() {
  const fb = getFirebase();
  if (!fb) return;
  try {
    await signOut(fb.auth);
  } catch {
    /* local logout still runs */
  }
}

export async function currentIdToken() {
  const fb = getFirebase();
  if (!fb?.auth.currentUser) return null;
  return fb.auth.currentUser.getIdToken();
}
