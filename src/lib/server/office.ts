import { firebaseConfig } from "@/lib/firebase-config";
import { bearerToken, readFirestoreDoc, verifyIdToken } from "@/lib/server/session";

export type FirestoreFields = Record<string, unknown>;

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
  return { stringValue: String(value) };
}

export function encodeFields(row: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    fields[key] = encodeValue(value);
  }
  return fields;
}

function projectId() {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
}

function apiKey() {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;
}

export async function writeFirestoreDoc(idToken: string, collection: string, id: string, row: Record<string, unknown>) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents/${collection}/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields({ ...row, id }) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 400) || "Could not write college record.");
  }
}

export async function createAuthAccount(email: string, password: string) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = (await res.json()) as { localId?: string; idToken?: string; error?: { message?: string } };
  if (!res.ok || !data.localId || !data.idToken) {
    const message = data.error?.message ?? "Could not create the login account.";
    if (message.includes("EMAIL_EXISTS")) return { ok: false as const, note: "That email already has a Firebase login." };
    return { ok: false as const, note: message };
  }
  return { ok: true as const, uid: data.localId, idToken: data.idToken };
}

export async function deleteAuthAccount(idToken: string) {
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  }).catch(() => undefined);
}

export async function requireOffice(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sign in required.");
  const session = await verifyIdToken(token);
  const profile = await readFirestoreDoc(token, "users", session.uid);
  if (!profile) throw new Error("No college profile.");
  const role = String(profile.role ?? "");
  if (role !== "admin" && role !== "staff") throw new Error("Only office staff can do this.");
  if (profile.active === false) throw new Error("This account is inactive.");
  return { token, session, profile, role };
}
