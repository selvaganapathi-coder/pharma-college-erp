import { NextResponse } from "next/server";
import { bearerToken, readFirestoreDoc, verifyIdToken } from "@/lib/server/session";

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function rateLimit(uid: string) {
  const now = Date.now();
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= 8) return false;
  recent.push(now);
  hits.set(uid, recent);
  return true;
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ ok: false, note: "Sign in required." }, { status: 401 });

  let session;
  try {
    session = await verifyIdToken(token);
  } catch {
    return NextResponse.json({ ok: false, note: "Invalid session." }, { status: 401 });
  }
  if (!rateLimit(session.uid)) {
    return NextResponse.json({ ok: false, note: "Too many alert requests. Try again in a minute." }, { status: 429 });
  }

  const profile = await readFirestoreDoc(token, "users", session.uid);
  const role = String(profile?.role ?? "");
  if (role !== "admin" && role !== "staff") {
    return NextResponse.json({ ok: false, note: "Only office staff can send alerts." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const message = String(body.body ?? "").trim();
  const channels: string[] = Array.isArray(body.channels) ? body.channels.map(String) : [];
  const studentId = String(body.studentId ?? "");
  if (!title || !message) {
    return NextResponse.json({ ok: false, note: "Title and message are required." }, { status: 400 });
  }

  let recipientPhone = "";
  if (studentId) {
    const student = await readFirestoreDoc(token, "students", studentId);
    recipientPhone = String(student?.phone ?? "").replace(/\D/g, "");
    if (!recipientPhone) {
      return NextResponse.json({
        ok: false,
        note: "The selected student has no phone number on file for SMS/WhatsApp.",
      }, { status: 400 });
    }
  }

  const sent: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  if (channels.includes("inapp")) sent.push("in-app stored");

  if (channels.includes("sms") || channels.includes("whatsapp")) {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) skipped.push("MSG91_AUTH_KEY is not configured");
    else if (!recipientPhone) skipped.push("SMS/WhatsApp needs a student with a phone number");
    else {
      try {
        const res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: { authkey: authKey, "Content-Type": "application/json" },
        body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            sender: process.env.MSG91_SENDER ?? "GPCOLG",
            short_url: "0",
            recipients: [{ mobiles: recipientPhone, VAR1: title, VAR2: message }],
          }),
        });
        if (res.ok) sent.push(...channels.filter((c) => c === "sms" || c === "whatsapp"));
        else failed.push("MSG91 rejected the request");
      } catch {
        failed.push("MSG91 network error");
      }
    }
  }

  if (channels.includes("email")) {
    if (!process.env.SMTP_HOST) skipped.push("SMTP_HOST is not configured");
    else skipped.push("SMTP delivery is configured but this server does not send mail without an SMTP transport implementation");
  }

  const ok = failed.length === 0;
  const note = [...sent, ...skipped, ...failed].join(". ") || "No channels selected.";
  return NextResponse.json({
    ok,
    delivered: sent,
    notConfigured: skipped,
    failed,
    note,
  });
}
