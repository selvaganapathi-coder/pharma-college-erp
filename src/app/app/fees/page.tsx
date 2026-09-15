"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { CourseSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { Fee, FeePlan } from "@/lib/types";

export default function FeesPage() {
  const { state, save, remove, allowed, scopedStudentId, user } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("fees", "write") && !sid;
  const rows = useMemo(() => (sid ? state.fees.filter((f) => f.studentId === sid) : state.fees), [state.fees, sid]);
  const [payId, setPayId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Fee | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<FeePlan | null>(null);
  const paying = state.fees.find((f) => f.id === payId);

  async function confirmPay() {
    if (!paying) return;
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeId: paying.id, amount: paying.amount, studentId: paying.studentId }),
    });
    const data = await res.json();
    const updated: Fee = {
      ...paying,
      status: "paid",
      paidAt: new Date().toISOString().slice(0, 10),
      method: "GP Pay / Razorpay",
      txnId: data.txnId ?? uid("txn"),
      receiptNo: paying.receiptNo ?? `REC-${uid("rec")}`,
    };
    await save("fees", updated, `Fee ${paying.term} paid by ${user?.name}.`);
    toast.success("Payment done. Receipt is ready.");
    setPayId(null);
    setReceipt(updated);
  }

  async function generateFromPlan(p: FeePlan) {
    const targets = state.students.filter((s) => s.courseId === p.courseId && s.year === p.year && s.status === "active");
    for (const st of targets) {
      const exists = state.fees.some((f) => f.studentId === st.id && f.planId === p.id);
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
        title="Fee payment"
        note="Admin can make fee plans, raise bills, edit, or delete. Students and parents pay and print a receipt. Card data is not stored."
        action={
          canWrite ? (
            <Button
              className="bg-[#C41E3A] text-[#FFE566]"
              onClick={() => {
                setPlan({
                  id: uid("fp"),
                  name: "",
                  courseId: state.courses.find((c) => c.kind === "programme")?.id ?? "",
                  year: 1,
                  amount: 0,
                  dueDate: new Date().toISOString().slice(0, 10),
                });
                setPlanOpen(true);
              }}
            >
              New fee plan
            </Button>
          ) : null
        }
      />
      {canWrite ? (
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          {state.feePlans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#C41E3A] bg-[#FFF8C2] p-3">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs">
                  {state.courses.find((c) => c.id === p.courseId)?.name} year {p.year} · ₹{p.amount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="bg-[#C41E3A] text-[#FFE566]" onClick={() => void generateFromPlan(p)}>
                  Raise bills
                </Button>
                <Button size="sm" variant="outline" className="border-[#C41E3A] text-[#C41E3A]" onClick={() => void remove("feePlans", p.id, `Deleted plan ${p.name}.`)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <DataTable
        rows={rows}
        empty="No fee bills yet."
        canWrite={canWrite}
        filter={(row, q) => {
          const st = state.students.find((s) => s.id === row.studentId);
          return !q || `${st?.name} ${st?.rollNo} ${row.term}`.toLowerCase().includes(q);
        }}
        onDelete={(r) => void remove("fees", r.id, `Deleted fee ${r.term}.`)}
        columns={[
          {
            key: "student",
            header: "Student",
            cell: (r) => {
              const st = state.students.find((s) => s.id === r.studentId);
              return `${st?.name ?? ""} · ${st?.rollNo ?? ""}`;
            },
          },
          { key: "term", header: "Bill", cell: (r) => r.term },
          { key: "amt", header: "Amount", cell: (r) => `₹${r.amount.toLocaleString("en-IN")}` },
          { key: "due", header: "Due", cell: (r) => r.dueDate },
          {
            key: "status",
            header: "Status",
            cell: (r) => (
              <Badge className="bg-[#C41E3A] text-[#FFE566]">
                {r.status}
                {r.receiptNo ? ` · ${r.receiptNo}` : ""}
              </Badge>
            ),
          },
          {
            key: "pay",
            header: "",
            cell: (r) =>
              r.status !== "paid" ? (
                <Button size="sm" className="bg-[#C41E3A] text-[#FFE566]" onClick={() => setPayId(r.id)}>
                  Pay now
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="border-[#C41E3A] text-[#C41E3A]" onClick={() => setReceipt(r)}>
                  Receipt
                </Button>
              ),
          },
        ]}
      />
      <Dialog open={Boolean(payId)} onOpenChange={(o) => !o && setPayId(null)}>
        <DialogContent className="bg-[#FFF8C2]">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">Secure checkout</DialogTitle>
          </DialogHeader>
          {paying ? (
            <div className="space-y-3">
              <p className="text-sm">
                Pay ₹{paying.amount.toLocaleString("en-IN")} for {paying.term}. Live Razorpay runs when keys are set. Demo
                pay still issues a receipt.
              </p>
              <div className="space-y-1">
                <Label>Card number</Label>
                <Input defaultValue="4111 1111 1111 1111" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Valid till</Label>
                  <Input defaultValue="12/28" />
                </div>
                <div className="space-y-1">
                  <Label>CVV</Label>
                  <Input defaultValue="123" type="password" />
                </div>
              </div>
              <Button className="w-full bg-[#C41E3A] text-[#FFE566]" onClick={() => void confirmPay()}>
                Pay ₹{paying.amount.toLocaleString("en-IN")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">Fee receipt</DialogTitle>
          </DialogHeader>
          {receipt ? (
            <div id="receipt" className="space-y-2 text-sm text-[#C41E3A]">
              <p className="text-lg font-bold">GP Pharmacy College</p>
              <p>Receipt {receipt.receiptNo}</p>
              <p>Student: {state.students.find((s) => s.id === receipt.studentId)?.name}</p>
              <p>Bill: {receipt.term}</p>
              <p>Amount: ₹{receipt.amount.toLocaleString("en-IN")}</p>
              <p>Paid on: {receipt.paidAt} · {receipt.method}</p>
              <p>Txn: {receipt.txnId}</p>
              <Button className="mt-2 bg-[#C41E3A] text-[#FFE566]" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="bg-[#FFF8C2]">
          <DialogHeader>
            <DialogTitle className="text-[#C41E3A]">Fee plan</DialogTitle>
          </DialogHeader>
          {plan ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
              </div>
              <CourseSelect
                courses={state.courses}
                kind="programme"
                value={plan.courseId}
                onChange={(id) => setPlan({ ...plan, courseId: id })}
              />
              <div className="grid grid-cols-3 gap-2">
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
              </div>
              <Button
                className="bg-[#C41E3A] text-[#FFE566]"
                disabled={!plan.name}
                onClick={async () => {
                  await save("feePlans", plan, `Saved fee plan ${plan.name}.`);
                  setPlanOpen(false);
                }}
              >
                Save plan
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
