"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { CourseSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDialog, FormSection } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Fee, FeePlan } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(s);
  });
}

export default function FeesPage() {
  const { state, save, remove, allowed, scopedStudentId, authHeader } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("fees", "write") && !sid;
  const rows = useMemo(
    () => (sid ? state.fees.filter((f) => f.studentId === sid && !f.deletedAt) : state.fees.filter((f) => !f.deletedAt)),
    [state.fees, sid],
  );
  const [receipt, setReceipt] = useState<Fee | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<FeePlan | null>(null);
  const [busy, setBusy] = useState(false);

  const due = rows.filter((f) => f.status !== "paid").reduce((s, f) => s + f.amount, 0);
  const collected = rows.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0);
  const overdue = rows.filter((f) => f.status !== "paid" && f.dueDate < new Date().toISOString().slice(0, 10));
  const rate = rows.length ? Math.round((rows.filter((f) => f.status === "paid").length / rows.length) * 100) : 0;

  async function startPay(fee: Fee) {
    setBusy(true);
    try {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateFromPlan(p: FeePlan) {
    const targets = state.students.filter((s) => s.courseId === p.courseId && s.year === p.year && s.status === "active" && !s.deletedAt);
    for (const st of targets) {
      const exists = state.fees.some((f) => f.studentId === st.id && f.planId === p.id && !f.deletedAt);
      if (exists) continue;
      await save(
        "fees",
        {
          id: uid("f"),
          studentId: st.id,
          planId: p.id,
          term: p.name,
          amount: p.amount,
          dueDate: p.dueDate,
          status: "due",
        },
        `Raised fee ${p.name} for ${st.name}.`,
      );
    }
    toast.success("Fee bills created for matching students.");
  }

  return (
    <Guard module="fees">
      <PageHeader
        title="Fee Management"
        note="Track and manage student fee payments."
        action={
          canWrite ? (
            <Button className="min-h-11" onClick={() => {
              setPlan({
                id: uid("fp"),
                name: "",
                courseId: state.courses.find((c) => c.kind === "programme")?.id ?? "",
                year: 1,
                amount: 0,
                dueDate: new Date().toISOString().slice(0, 10),
              });
              setPlanOpen(true);
            }}>
              New fee plan
            </Button>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total due" value={`₹${due.toLocaleString("en-IN")}`} tone="gold" />
        <StatCard title="Collected" value={`₹${collected.toLocaleString("en-IN")}`} note="Paid after verification" tone="maroon" />
        <StatCard title="Overdue bills" value={`${overdue.length}`} tone="red" />
        <StatCard title="Collection rate" value={`${rate}%`} />
      </div>
      {canWrite ? (
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          {state.feePlans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs">
                  {state.courses.find((c) => c.id === p.courseId)?.name ?? "Unknown Course"} year {p.year} · ₹{p.amount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="min-h-11" onClick={() => void generateFromPlan(p)}>Raise bills</Button>
                <Button size="sm" variant="outline" className="min-h-11" onClick={() => void remove("feePlans", p.id, `Archived plan ${p.name}.`)}>Archive</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <DataTable
        rows={rows}
        empty="No fee bills yet. Create a plan and raise bills for a programme year."
        emptyTitle="No fee bills"
        canWrite={canWrite}
        mobileTitle={(r) => r.term}
        filter={(row, q) => {
          const st = state.students.find((s) => s.id === row.studentId);
          return !q || `${st?.name} ${st?.rollNo} ${row.term}`.toLowerCase().includes(q);
        }}
        onDelete={(r) => void remove("fees", r.id, `Archived fee ${r.term}.`)}
        columns={[
          {
            key: "student",
            header: "Student",
            cell: (r) => {
              const st = state.students.find((s) => s.id === r.studentId);
              return st ? `${st.name} · ${st.rollNo}` : "Unknown Student";
            },
          },
          { key: "term", header: "Bill", cell: (r) => r.term },
          { key: "amt", header: "Amount", cell: (r) => `₹${r.amount.toLocaleString("en-IN")}` },
          { key: "due", header: "Due", cell: (r) => r.dueDate },
          {
            key: "status",
            header: "Status",
            cell: (r) => <Badge variant="outline">{r.status}</Badge>,
          },
          {
            key: "pay",
            header: "Payment",
            hideOnMobile: true,
            cell: (r) =>
              r.status !== "paid" ? (
                <Button size="sm" className="min-h-11" disabled={busy} onClick={() => void startPay(r)}>
                  Pay with Razorpay
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="min-h-11" onClick={() => setReceipt(r)}>
                  Receipt
                </Button>
              ),
          },
        ]}
      />
      <FormDialog
        open={Boolean(receipt)}
        onOpenChange={(o) => !o && setReceipt(null)}
        title="Fee receipt"
        description="Official receipt from GP Pharmacy College."
        size="sm"
        submitLabel="Print"
        onSubmit={() => window.print()}
      >
        {receipt ? (
          <div id="receipt" className="space-y-2 text-sm">
            <p className="text-lg font-bold">GP Pharmacy College</p>
            <p>Receipt {receipt.receiptNo}</p>
            <p>Student: {state.students.find((s) => s.id === receipt.studentId)?.name ?? "Unknown Student"}</p>
            <p>Admission No: {state.students.find((s) => s.id === receipt.studentId)?.rollNo ?? "—"}</p>
            <p>Bill: {receipt.term}</p>
            <p>Amount: ₹{receipt.amount.toLocaleString("en-IN")}</p>
            <p>
              Paid on: {receipt.paidAt} · {receipt.method}
            </p>
            <p>Txn: {receipt.txnId}</p>
          </div>
        ) : null}
      </FormDialog>
      <FormDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        title="Fee plan"
        description="Bills are raised only for students on the selected programme and year."
        submitLabel="Save plan"
        onSubmit={async () => {
          if (!plan?.name || plan.amount < 1) {
            toast.error("Plan name and amount are required.");
            return;
          }
          const result = await save("feePlans", plan, `Saved fee plan ${plan.name}.`);
          if (!result.ok) return;
          toast.success("Fee plan saved successfully.");
          setPlanOpen(false);
        }}
      >
        {plan ? (
          <FormSection title="Plan">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
            </div>
            <CourseSelect courses={state.courses} kind="programme" value={plan.courseId} onChange={(id) => setPlan({ ...plan, courseId: id })} />
            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={plan.year} onChange={(e) => setPlan({ ...plan, year: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" value={plan.amount} onChange={(e) => setPlan({ ...plan, amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Due</Label>
              <Input type="date" value={plan.dueDate} onChange={(e) => setPlan({ ...plan, dueDate: e.target.value })} />
            </div>
          </FormSection>
        ) : null}
      </FormDialog>
    </Guard>
  );
}
