import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverChannels, sendEmail, sendSms, sendWhatsApp, toMsg91Mobile } from "@/lib/server/messaging";
import { httpStatusForOfficeError } from "@/lib/server/office";
import { readFileSync } from "node:fs";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("messaging skips cleanly when keys are missing", () => {
  it("does not call the network for email, sms, or whatsapp", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("MSG91_AUTH_KEY", "");
    vi.stubEnv("MSG91_SMS_TEMPLATE_ID", "");
    vi.stubEnv("MSG91_TEMPLATE_ID", "");
    vi.stubEnv("MSG91_SENDER_ID", "");
    vi.stubEnv("MSG91_SENDER", "");
    vi.stubEnv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "");
    vi.stubEnv("MSG91_WHATSAPP_TEMPLATE_NAME", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const email = await sendEmail({ to: "a@college.edu", subject: "Hi", text: "Hello" });
    const sms = await sendSms({ to: "9876543210", title: "Hi", body: "Hello" });
    const whatsapp = await sendWhatsApp({ to: "9876543210", title: "Hi", body: "Hello" });
    expect(email.skipped).toBe(true);
    expect(sms.skipped).toBe(true);
    expect(whatsapp.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const delivered = await deliverChannels({
      channels: ["email", "sms", "whatsapp"],
      email: "a@college.edu",
      phone: "9876543210",
      title: "Notice",
      body: "Exam tomorrow",
    });
    expect(delivered.failed).toEqual([]);
    expect(delivered.skipped.length).toBe(3);
  });

  it("posts sms and whatsapp to different MSG91 endpoints when configured", async () => {
    vi.stubEnv("MSG91_AUTH_KEY", "test-key");
    vi.stubEnv("MSG91_SMS_TEMPLATE_ID", "sms-template");
    vi.stubEnv("MSG91_SENDER_ID", "GPCOLG");
    vi.stubEnv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "919800000000");
    vi.stubEnv("MSG91_WHATSAPP_TEMPLATE_NAME", "college_notice");
    const fetchMock = vi.fn(async (url: string) => {
      void url;
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await sendSms({ to: "9876543210", title: "Fee", body: "Due" });
    await sendWhatsApp({ to: "9876543210", title: "Fee", body: "Due" });
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("/api/v5/flow"))).toBe(true);
    expect(urls.some((url) => url.includes("whatsapp-outbound-message"))).toBe(true);
    expect(toMsg91Mobile("9876543210")).toBe("919876543210");
  });
});

describe("office HTTP status", () => {
  it("returns 401 when there is no session", () => {
    expect(httpStatusForOfficeError("Sign in required.")).toBe(401);
    expect(httpStatusForOfficeError("Invalid or expired session.")).toBe(401);
    expect(httpStatusForOfficeError("Only office staff can do this.")).toBe(403);
  });
});

describe("setup lock in rules", () => {
  it("denies client writes to the setup document", () => {
    const rules = readFileSync(new URL("../../../firestore.rules", import.meta.url), "utf8");
    expect(rules).toMatch(/match \/meta\/setup[\s\S]*allow list, create, update, delete: if false;/);
    expect(rules).not.toMatch(/request\.resource\.data\.role == 'admin'/);
  });
});
