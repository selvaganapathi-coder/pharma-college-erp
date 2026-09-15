import { firebaseConfig } from "@/lib/firebase-config";

export type SessionUser = { uid: string; email: string };

export async function verifyIdToken(idToken: string): Promise<SessionUser> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json()) as { users?: { localId: string; email?: string }[] };
  const user = data.users?.[0];
  if (!res.ok || !user?.localId) {
    throw new Error("Invalid or expired session.");
  }
  return { uid: user.localId, email: user.email ?? "" };
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean };

function unwrap(fields?: Record<string, FirestoreValue>) {
  const out: Record<string, string | number | boolean> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
  }
  return out;
}

export async function readFirestoreDoc(
  idToken: string,
  collection: string,
  id: string,
): Promise<Record<string, string | number | boolean> | null> {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${collection}/${id}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Could not read college record.");
  const data = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return { id, ...unwrap(data.fields) };
}
