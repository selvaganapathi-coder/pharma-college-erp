import { firebaseConfig } from "@/lib/firebase-config";

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
};

function unwrap(fields?: Record<string, FirestoreValue>) {
  const out: Record<string, string | number | boolean | null> = {};
  if (!fields) return out;
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) out[key] = value.stringValue;
    else if (value.integerValue !== undefined) out[key] = Number(value.integerValue);
    else if (value.doubleValue !== undefined) out[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) out[key] = value.booleanValue;
    else if (value.nullValue !== undefined) out[key] = null;
  }
  return out;
}

export async function queryByField(
  idToken: string,
  collection: string,
  field: string,
  value: string,
  limit = 80,
): Promise<Array<Record<string, string | number | boolean | null>>> {
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
        limit,
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 240) || "Could not query college records.");
  }
  const rows = (await res.json()) as Array<{ document?: { name?: string; fields?: Record<string, FirestoreValue> } }>;
  return rows
    .filter((row) => row.document?.name)
    .map((row) => {
      const name = row.document?.name ?? "";
      const id = name.split("/").pop() ?? "";
      return { id, ...unwrap(row.document?.fields) };
    });
}
