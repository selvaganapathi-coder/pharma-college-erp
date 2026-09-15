import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function adminDb() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const creds = JSON.parse(json) as { project_id: string; client_email: string; private_key: string };
    if (!getApps().length) {
      initializeApp({ credential: cert({ projectId: creds.project_id, clientEmail: creds.client_email, privateKey: creds.private_key.replace(/\\n/g, "\n") }) });
    }
    return getFirestore();
  } catch {
    return null;
  }
}
