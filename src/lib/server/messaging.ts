import { publicAppUrl } from "./app-url";

export type SendResult = { ok: boolean; skipped?: boolean; error?: string; id?: string };

export type OutboundMessage = {
  toEmail?: string;
  toPhone?: string;
  name?: string;
  subject: string;
  text: string;
  html?: string;
};

const SMS_URL = "https://control.msg91.com/api/v5/flow/";
const WHATSAPP_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

function warn(channel: string, reason: string) {
  console.warn(`[messaging] ${channel} skipped: ${reason}`);
}

export function toMsg91Mobile(input: string | undefined | null): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

function smsTemplateId() {
  return process.env.MSG91_SMS_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID || "";
}

function smsSenderId() {
  return process.env.MSG91_SENDER_ID || process.env.MSG91_SENDER || "";
}

async function postJson(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 500) };
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    const reason = !key ? "RESEND_API_KEY is not set" : "RESEND_FROM_EMAIL is not set";
    warn("email", reason);
    return { ok: true, skipped: true, error: reason };
  }
  const to = input.to.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Recipient email is missing." };
  try {
    const res = await postJson("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<p>${escapeHtml(input.text)}</p>`,
      }),
    });
    if (!res.ok) {
      console.warn(`[messaging] email failed: ${res.status} ${res.body}`);
      return { ok: false, error: "Resend rejected the email." };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(res.body) as { id?: string }).id;
    } catch {
      id = undefined;
    }
    return { ok: true, id };
  } catch (err) {
    console.warn("[messaging] email network error", err instanceof Error ? err.message : err);
    return { ok: false, error: "Resend network error." };
  }
}

export async function sendSms(input: { to: string; title: string; body: string }): Promise<SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = smsTemplateId();
  const sender = smsSenderId();
  if (!authKey || !templateId || !sender) {
    const reason = !authKey ? "MSG91_AUTH_KEY is not set" : !templateId ? "MSG91_SMS_TEMPLATE_ID is not set" : "MSG91_SENDER_ID is not set";
    warn("sms", reason);
    return { ok: true, skipped: true, error: reason };
  }
  const mobiles = toMsg91Mobile(input.to);
  if (!mobiles) return { ok: false, error: "Recipient phone is missing or not a valid mobile number." };
  try {
    const res = await postJson(SMS_URL, {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: templateId,
        sender,
        short_url: "0",
        recipients: [{ mobiles, VAR1: clip(input.title, 30), VAR2: clip(input.body, 60) }],
      }),
    });
    if (!res.ok) {
      console.warn(`[messaging] sms failed: ${res.status} ${res.body}`);
      return { ok: false, error: "MSG91 rejected the SMS. Check the DLT template id and sender." };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[messaging] sms network error", err instanceof Error ? err.message : err);
    return { ok: false, error: "MSG91 SMS network error." };
  }
}

export async function sendWhatsApp(input: { to: string; title: string; body: string }): Promise<SendResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const integrated = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER;
  const template = process.env.MSG91_WHATSAPP_TEMPLATE_NAME;
  if (!authKey || !integrated || !template) {
    const reason = !authKey
      ? "MSG91_AUTH_KEY is not set"
      : !integrated
        ? "MSG91_WHATSAPP_INTEGRATED_NUMBER is not set"
        : "MSG91_WHATSAPP_TEMPLATE_NAME is not set";
    warn("whatsapp", reason);
    return { ok: true, skipped: true, error: reason };
  }
  const mobile = toMsg91Mobile(input.to);
  if (!mobile) return { ok: false, error: "Recipient phone is missing or not a valid mobile number." };
  const language = process.env.MSG91_WHATSAPP_LANGUAGE || "en";
  const namespace = process.env.MSG91_WHATSAPP_NAMESPACE;
  const templateBody: Record<string, unknown> = {
    name: template,
    language: { code: language, policy: "deterministic" },
    to_and_components: [
      {
        to: [mobile],
        components: {
          body_1: { type: "text", value: clip(input.title, 60) },
          body_2: { type: "text", value: clip(input.body, 200) },
        },
      },
    ],
  };
  if (namespace) templateBody.namespace = namespace;
  try {
    const res = await postJson(WHATSAPP_URL, {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        integrated_number: integrated.replace(/\D/g, ""),
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: templateBody,
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[messaging] whatsapp failed: ${res.status} ${res.body}`);
      return { ok: false, error: "MSG91 rejected the WhatsApp template send." };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[messaging] whatsapp network error", err instanceof Error ? err.message : err);
    return { ok: false, error: "MSG91 WhatsApp network error." };
  }
}

export async function deliverChannels(input: {
  channels: string[];
  email?: string;
  phone?: string;
  title: string;
  body: string;
}): Promise<{ sent: string[]; skipped: string[]; failed: string[] }> {
  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  const jobs: Promise<void>[] = [];
  if (input.channels.includes("email")) {
    jobs.push(
      sendEmail({
        to: input.email ?? "",
        subject: input.title,
        text: input.body,
        html: `<p>${escapeHtml(input.body)}</p><p><a href="${publicAppUrl()}">Open the college portal</a></p>`,
      }).then((result) => classify("email", result, sent, skipped, failed)),
    );
  }
  if (input.channels.includes("sms")) {
    jobs.push(
      sendSms({ to: input.phone ?? "", title: input.title, body: input.body }).then((result) =>
        classify("sms", result, sent, skipped, failed),
      ),
    );
  }
  if (input.channels.includes("whatsapp")) {
    jobs.push(
      sendWhatsApp({ to: input.phone ?? "", title: input.title, body: input.body }).then((result) =>
        classify("whatsapp", result, sent, skipped, failed),
      ),
    );
  }
  await Promise.all(jobs);
  return { sent, skipped, failed };
}

export async function sendPortalWelcome(input: { role: "student" | "parent" | "staff"; name: string; email?: string; phone?: string }) {
  const url = publicAppUrl();
  const title = "Your college portal login is ready";
  const text = `Hello ${input.name}, your ${input.role} login for GP Pharmacy College is ready. Sign in at ${url} with this email address. Use Forgot password on the sign-in page if you need a new password.`;
  const email = input.email ? await sendEmail({ to: input.email, subject: title, text }) : { ok: true, skipped: true, error: "No email on file." };
  const sms = input.phone ? await sendSms({ to: input.phone, title, body: text }) : { ok: true, skipped: true, error: "No phone on file." };
  return { email, sms };
}

function classify(channel: string, result: SendResult, sent: string[], skipped: string[], failed: string[]) {
  if (result.skipped) skipped.push(`${channel}: ${result.error ?? "not configured"}`);
  else if (!result.ok) failed.push(`${channel}: ${result.error ?? "failed"}`);
  else sent.push(channel);
}

function clip(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
