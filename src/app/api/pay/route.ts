import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount ?? 0);
  if (!amount || amount < 1) {
    return NextResponse.json({ ok: false, note: "Bad amount." }, { status: 400 });
  }

  const key = process.env.RAZORPAY_KEY_SECRET;
  const txnId = `GPX${Date.now().toString().slice(-8)}`;

  if (key) {
    return NextResponse.json({
      ok: true,
      txnId,
      note: "Live gateway key is present. Capture the payment on your Razorpay dashboard.",
    });
  }

  return NextResponse.json({
    ok: true,
    txnId,
    mode: "college",
    note: "Receipt issued by GP Pharmacy College. Card data was not stored. Add Razorpay keys for bank capture.",
  });
}
