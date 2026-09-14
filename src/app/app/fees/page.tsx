"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SearchTable } from "@/components/search-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";

export default function FeesPage() {
  const { state, mutate, scopedStudentId, user } = useApp();
  const sid = scopedStudentId();
  const rows = useMemo(
    () => (sid ? state.fees.filter((f) => f.studentId === sid) : state.fees),
    [state.fees, sid],
  );
  const [payId, setPayId] = useState<string | null>(null);
  const [card, setCard] = useState("4111 1111 1111 1111");
  const paying = state.fees.find((f) => f.id === payId);

  async function confirmPay() {
    if (!paying) return;
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeId: paying.id, amount: paying.amount, studentId: paying.studentId }),
    });
    const data = await res.json();
    mutate((draft) => {
      const fee = draft.fees.find((f) => f.id === paying.id);
      if (fee) {
        fee.status = "paid";
        fee.paidAt = new Date().toISOString().slice(0, 10);
        fee.method = "GP Pay";
        fee.txnId = data.txnId ?? uid("txn");
      }
      return `Fee ${paying.term} paid by ${user?.name}. Txn ${fee?.txnId}.`;
    }, "fees", paying.id);
    toast.success("Payment done. Receipt saved.");
    setPayId(null);
  }

  return (
    <Guard module="fees">
      <PageHeader
        title="Fee payment"
        note="Pay college fees with the secure GP Pay checkout. Card details stay on this form and are not stored. Live Razorpay keys can be added later."
      />
      <SearchTable
        rows={rows}
        empty="No fee bills yet."
        filter={(row, q) => {
          const st = state.students.find((s) => s.id === row.studentId);
          return !q || `${st?.name} ${st?.rollNo} ${row.term}`.toLowerCase().includes(q);
        }}
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
          { key: "due", header: "Due date", cell: (r) => r.dueDate },
          {
            key: "status",
            header: "Status",
            cell: (r) => (
              <Badge className={r.status === "paid" ? "bg-[#EAB308] text-[#4A1C1C]" : "bg-[#C41E3A]"}>
                {r.status}
                {r.txnId ? ` · ${r.txnId}` : ""}
              </Badge>
            ),
          },
          {
            key: "pay",
            header: "",
            cell: (r) =>
              r.status !== "paid" && (sid ? r.studentId === sid : true) ? (
                <Button size="sm" className="bg-[#C41E3A] text-white" onClick={() => setPayId(r.id)}>
                  Pay now
                </Button>
              ) : (
                "—"
              ),
          },
        ]}
      />
      <Dialog open={Boolean(payId)} onOpenChange={(o) => !o && setPayId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GP Pay — secure checkout</DialogTitle>
          </DialogHeader>
          {paying ? (
            <div className="space-y-3">
              <p className="text-sm text-[#6B4A1F]">
                Paying ₹{paying.amount.toLocaleString("en-IN")} for {paying.term}. This is a demo gateway unless live
                keys are set.
              </p>
              <div className="space-y-1">
                <Label>Card number</Label>
                <Input value={card} onChange={(e) => setCard(e.target.value)} />
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
              <Button className="w-full bg-[#C41E3A] text-white" onClick={confirmPay}>
                Pay ₹{paying.amount.toLocaleString("en-IN")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
