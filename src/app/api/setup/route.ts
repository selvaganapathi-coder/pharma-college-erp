import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/server/admin";

export const runtime = "nodejs";

function notConfigured() {
  return NextResponse.json(
    {
      ok: false,
      open: false,
      note: "Setup is closed until FIREBASE_SERVICE_ACCOUNT_JSON is set on the server. Client pages cannot create an administrator.",
    },
    { status: 503 },
  );
}

async function setupState(heal: boolean) {
  const db = adminDb();
  if (!db) return { configured: false as const, open: false };
  const setupRef = db.doc("meta/setup");
  const setup = await setupRef.get();
  if (setup.exists) return { configured: true as const, open: false };
  const admins = await db.collection("users").where("role", "==", "admin").limit(1).get();
  if (!admins.empty) {
    if (heal) {
      await setupRef.set({
        adminUid: admins.docs[0].id,
        at: new Date().toISOString(),
        source: "healed",
      });
    }
    return { configured: true as const, open: false };
  }
  return { configured: true as const, open: true };
}

export async function GET() {
  const db = adminDb();
  if (!db) return notConfigured();
  try {
    const state = await setupState(true);
    return NextResponse.json({
      ok: true,
      open: state.open,
      note: state.open ? "The first administrator can be created." : "An administrator already exists. Sign in.",
    });
  } catch (err) {
    console.warn("[setup] status check failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, open: false, note: "Could not verify college setup." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const db = adminDb();
  if (!db) return notConfigured();
  const body = (await request.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; phone?: string };
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const phone = String(body.phone ?? "").trim();
  if (!name || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ ok: false, open: true, note: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
  }

  let uid = "";
  try {
    const state = await setupState(true);
    if (!state.open) {
      return NextResponse.json({ ok: false, open: false, note: "An administrator already exists. Sign in." }, { status: 403 });
    }
    const created = await getAuth().createUser({ email, password, displayName: name });
    uid = created.uid;
    await db.runTransaction(async (tx) => {
      const setupRef = db.doc("meta/setup");
      const setup = await tx.get(setupRef);
      const admins = await tx.get(db.collection("users").where("role", "==", "admin").limit(1));
      if (setup.exists || !admins.empty) {
        throw new Error("closed");
      }
      tx.set(db.doc(`users/${uid}`), {
        id: uid,
        uid,
        email,
        name,
        role: "admin",
        phone,
        active: true,
      });
      tx.set(setupRef, { adminUid: uid, at: new Date().toISOString(), source: "setup" });
    });
    return NextResponse.json({ ok: true, open: false, uid });
  } catch (err) {
    if (uid) await getAuth().deleteUser(uid).catch(() => undefined);
    const closed = err instanceof Error && err.message === "closed";
    if (closed) {
      return NextResponse.json({ ok: false, open: false, note: "An administrator already exists. Sign in." }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Could not create the administrator.";
    const friendly = message.includes("email-already-exists") || message.includes("EMAIL_EXISTS")
      ? "That email already has a login. Sign in instead."
      : "Could not create the administrator.";
    console.warn("[setup] create failed", message);
    return NextResponse.json({ ok: false, open: true, note: friendly }, { status: 409 });
  }
}
