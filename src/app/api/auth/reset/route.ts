import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/server/admin";
import { publicAppUrl } from "@/lib/server/app-url";
import { sendEmail } from "@/lib/server/messaging";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();
const GENERIC = "If that email has a login, a reset message is on its way.";

function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= 5) return true;
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, note: "Enter a valid email address." }, { status: 400 });
  }
  if (limited(email)) {
    return NextResponse.json({ ok: false, note: "Too many reset attempts. Wait a minute and try again." }, { status: 429 });
  }

  const canResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  if (!adminDb() || !canResend) {
    return NextResponse.json({ ok: true, transport: "client", note: GENERIC });
  }

  try {
    const link = await getAuth().generatePasswordResetLink(email, { url: publicAppUrl() });
    const sent = await sendEmail({
      to: email,
      subject: "Reset your GP Pharmacy College password",
      text: `Choose a new password for GP Pharmacy College: ${link}`,
      html: `<p>Choose a new password for GP Pharmacy College.</p><p><a href="${link}">Reset password</a></p>`,
    });
    if (!sent.ok && !sent.skipped) {
      return NextResponse.json({ ok: false, note: sent.error ?? "Could not send the reset email." }, { status: 502 });
    }
    if (sent.skipped) return NextResponse.json({ ok: true, transport: "client", note: GENERIC });
    return NextResponse.json({ ok: true, transport: "resend", note: GENERIC });
  } catch (err) {
    console.warn("[auth/reset]", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true, transport: "client", note: GENERIC });
  }
}
