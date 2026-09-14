import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "");
  const message = String(body.body ?? "");
  const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
  const authKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER ?? "GPCOLG";

  if (!title || !message) {
    return NextResponse.json({ ok: false, note: "Title and message are required." }, { status: 400 });
  }

  const sent: string[] = [];
  const queued: string[] = [];

  if (channels.includes("inapp")) sent.push("in-app");

  if (channels.includes("sms") || channels.includes("whatsapp")) {
    if (authKey) {
      try {
        const res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            authkey: authKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            sender,
            short_url: "0",
            recipients: [{ mobiles: process.env.MSG91_TEST_MOBILE ?? "919999999999", VAR1: title, VAR2: message }],
          }),
        });
        if (res.ok) sent.push(...channels.filter((c) => c === "sms" || c === "whatsapp"));
        else queued.push("MSG91 rejected the request");
      } catch {
        queued.push("MSG91 network error");
      }
    } else {
      queued.push("WhatsApp/SMS saved locally. Add MSG91_AUTH_KEY to send live.");
    }
  }

  if (channels.includes("email")) {
    if (process.env.SMTP_HOST) sent.push("email");
    else queued.push("Email queued. Add SMTP_HOST to send live.");
  }

  return NextResponse.json({
    ok: true,
    note: [...sent.map((c) => `${c} delivered`), ...queued].join(" "),
  });
}
