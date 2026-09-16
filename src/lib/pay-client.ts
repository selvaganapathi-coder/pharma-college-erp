import { toast } from "sonner";
import type { Fee } from "./types";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpay() {
  if (typeof window === "undefined") return;
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(s);
  });
}

export async function startFeePayment(fee: Fee, authHeader: () => Promise<HeadersInit>) {
  const headers = await authHeader();
  const res = await fetch("/api/pay", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "order", feeId: fee.id }),
  });
  const data = await res.json();
  if (!data.ok) {
    toast.error(data.note ?? "Payment is not available.");
    return;
  }
  await loadRazorpay();
  if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable.");
  const rz = new window.Razorpay({
    key: data.keyId,
    amount: Math.round(Number(data.amount) * 100),
    currency: "INR",
    name: "GP Pharmacy College",
    description: fee.term,
    order_id: data.orderId,
    handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      const v = await fetch("/api/pay", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", feeId: fee.id, ...response }),
      });
      const out = await v.json();
      if (out.ledgerUpdated) toast.success("Payment verified. Fee marked paid.");
      else toast.error(out.note ?? "Gateway verified, but the fee ledger was not updated.");
    },
  });
  rz.open();
}
