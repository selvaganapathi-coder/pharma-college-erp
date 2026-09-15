import { NextResponse } from "next/server";
import { bearerToken, readFirestoreDoc, verifyIdToken } from "@/lib/server/session";
import { createRazorpayOrder, razorpayConfigured, verifyRazorpaySignature } from "@/lib/server/razorpay";
import { adminDb } from "@/lib/server/admin";

async function officeOrOwner(idToken: string, feeStudentId: string) {
  const session = await verifyIdToken(idToken);
  const profile = await readFirestoreDoc(idToken, "users", session.uid);
  if (!profile) throw new Error("No college profile.");
  const role = String(profile.role ?? "");
  if (role === "admin") return { session, profile, role };
  if (role === "student" && String(profile.studentId) === feeStudentId) return { session, profile, role };
  if (role === "parent" && String(profile.childStudentId) === feeStudentId) return { session, profile, role };
  throw new Error("You cannot pay this fee.");
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ ok: false, note: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "order");

  try {
    if (action === "order") {
      if (!razorpayConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            configured: false,
            note: "Razorpay is not configured. Fees cannot be marked paid from the browser.",
          },
          { status: 503 },
        );
      }
      const feeId = String(body.feeId ?? "");
      if (!feeId) return NextResponse.json({ ok: false, note: "feeId is required." }, { status: 400 });
      const fee = await readFirestoreDoc(token, "fees", feeId);
      if (!fee) return NextResponse.json({ ok: false, note: "Fee record not found." }, { status: 404 });
      if (String(fee.status) === "paid") {
        return NextResponse.json({ ok: false, note: "This fee is already paid." }, { status: 409 });
      }
      const amount = Number(fee.amount);
      if (!amount || amount < 1) return NextResponse.json({ ok: false, note: "Fee amount on record is invalid." }, { status: 400 });
      await officeOrOwner(token, String(fee.studentId));
      const order = await createRazorpayOrder(Math.round(amount * 100), feeId.slice(0, 40));
      return NextResponse.json({
        ok: true,
        orderId: order.orderId,
        keyId: order.keyId,
        amount,
        feeId,
        note: "Pay with Razorpay Checkout. The ledger updates only after signature verification.",
      });
    }

    if (action === "verify") {
      const feeId = String(body.feeId ?? "");
      const orderId = String(body.razorpay_order_id ?? "");
      const paymentId = String(body.razorpay_payment_id ?? "");
      const signature = String(body.razorpay_signature ?? "");
      if (!feeId || !orderId || !paymentId || !signature) {
        return NextResponse.json({ ok: false, note: "Missing Razorpay verification fields." }, { status: 400 });
      }
      if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
        return NextResponse.json({ ok: false, note: "Payment signature is invalid." }, { status: 400 });
      }
      const fee = await readFirestoreDoc(token, "fees", feeId);
      if (!fee) return NextResponse.json({ ok: false, note: "Fee record not found." }, { status: 404 });
      await officeOrOwner(token, String(fee.studentId));
      if (String(fee.status) === "paid") {
        return NextResponse.json({ ok: true, duplicate: true, note: "Already recorded as paid." });
      }
      const db = adminDb();
      if (!db) {
        return NextResponse.json({
          ok: true,
          verified: true,
          ledgerUpdated: false,
          note: "Razorpay payment is verified. FIREBASE_SERVICE_ACCOUNT_JSON is required to mark the fee paid in the ledger.",
        });
      }
      const ref = db.collection("fees").doc(feeId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error("Fee missing.");
        const data = snap.data() ?? {};
        if (data.status === "paid") return;
        tx.set(
          ref,
          {
            ...data,
            status: "paid",
            paidAt: new Date().toISOString().slice(0, 10),
            method: "Razorpay",
            txnId: paymentId,
            gatewayOrderId: orderId,
            gatewayPaymentId: paymentId,
            receiptNo: data.receiptNo ?? `REC-${feeId.slice(-8)}`,
          },
          { merge: true },
        );
        tx.set(db.collection("payments").doc(paymentId), {
          feeId,
          uid: (await verifyIdToken(token)).uid,
          amount: data.amount,
          orderId,
          paymentId,
          at: new Date().toISOString(),
        });
      });
      return NextResponse.json({ ok: true, verified: true, ledgerUpdated: true, txnId: paymentId });
    }

    return NextResponse.json({ ok: false, note: "Unknown payment action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, note: err instanceof Error ? err.message : "Payment failed." }, { status: 400 });
  }
}
