import { NextResponse } from "next/server";
import { bearerToken, readFirestoreDoc, verifyIdToken } from "@/lib/server/session";
import { queryByField } from "@/lib/server/firestore-query";
import { deliverChannels } from "@/lib/server/messaging";

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

type Recipient = { email?: string; phone?: string; name?: string };

function contacts(row: Record<string, string | number | boolean | null>, audience: string): Recipient[] {
  const aud = audience.toLowerCase();
  const student: Recipient = {
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    name: String(row.name ?? ""),
  };
  const parent: Recipient = {
    email: String(row.parentEmail ?? ""),
    phone: String(row.parentPhone ?? ""),
    name: String(row.parentName ?? ""),
  };
  if (aud === "parent" || aud === "parents") return [parent];
  if (aud === "all") return [student, parent];
  return [student];
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
  const sectionId = String(body.sectionId ?? "");
  const audience = String(body.audience ?? "All");
  if (!title || !message) {
    return NextResponse.json({ ok: false, note: "Title and message are required." }, { status: 400 });
  }

  const external = channels.some((channel) => channel === "sms" || channel === "whatsapp" || channel === "email");
  const recipients: Recipient[] = [];
  if (studentId) {
    const student = await readFirestoreDoc(token, "students", studentId);
    if (!student) return NextResponse.json({ ok: false, note: "That student record was not found." }, { status: 404 });
    recipients.push(...contacts(student, audience));
  } else if (sectionId) {
    try {
      const students = await queryByField(token, "students", "sectionId", sectionId, 80);
      for (const student of students) recipients.push(...contacts(student, audience));
    } catch (err) {
      return NextResponse.json(
        { ok: false, note: err instanceof Error ? err.message : "Could not load the section." },
        { status: 502 },
      );
    }
  }

  const sent: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  if (channels.includes("inapp")) sent.push("in-app stored");

  if (external && recipients.length === 0) {
    skipped.push("Select a student or section to send email, SMS, or WhatsApp.");
  }

  const seen = new Set<string>();
  for (const recipient of recipients.slice(0, 80)) {
    const key = `${recipient.email ?? ""}|${recipient.phone ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await deliverChannels({
      channels,
      email: recipient.email,
      phone: recipient.phone,
      title,
      body: message,
    });
    sent.push(...result.sent.map((channel) => `${channel}${recipient.name ? ` → ${recipient.name}` : ""}`));
    skipped.push(...result.skipped);
    failed.push(...result.failed);
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
