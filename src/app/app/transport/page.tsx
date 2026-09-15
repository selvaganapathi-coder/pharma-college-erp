"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { PhotoUpload } from "@/components/photo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import type { BusRoute } from "@/lib/types";

export default function TransportPage() {
  const { state, save, remove, allowed, scopedStudentId, upload } = useApp();
  const sid = scopedStudentId();
  const canWrite = allowed("transport", "write") && !sid;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BusRoute | null>(null);
  const routes = state.routes.filter((r) => {
    if (!sid) return true;
    return state.students.find((s) => s.id === sid)?.busRouteId === r.id;
  });

  return (
    <Guard module="transport">
      <PageHeader
        title="Transport"
        note="Bus routes, vehicle photo, driver, stops, and who rides. Add, edit, or delete a route."
        action={
          canWrite ? (
            <Button
              onClick={() => {
                setForm({ id: uid("r"), name: "", vehicleNo: "", driver: "", driverPhone: "", stops: "", seats: 30 });
                setOpen(true);
              }}
            >
              Add route
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {routes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground md:col-span-2">
            No bus routes yet. Add the first vehicle and driver.
          </p>
        ) : null}
        {routes.map((r) => {
          const riders = state.students.filter((s) => s.busRouteId === r.id);
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle>{r.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt="" className="h-32 w-full rounded-lg object-cover" />
                ) : null}
                <p>
                  Bus {r.vehicleNo} · {r.seats} seats · {riders.length} students
                </p>
                <p>
                  Driver {r.driver} · {r.driverPhone}
                </p>
                <p>Stops: {r.stops}</p>
                <div className="flex flex-wrap gap-1">
                  {riders.map((s) => (
                    <Badge key={s.id} variant="outline">
                      {s.name}
                    </Badge>
                  ))}
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setForm(r); setOpen(true); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void remove("routes", r.id, `Deleted route ${r.name}.`)}>
                      Delete
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bus route</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <PhotoUpload
                label="Vehicle photo"
                value={form.photoUrl}
                onChange={(url) => setForm({ ...form, photoUrl: url })}
                onFile={(file) => upload("transport", form.id, file)}
              />
              {(["name", "vehicleNo", "driver", "driverPhone", "stops"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <Label>{key}</Label>
                  <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div className="space-y-1">
                <Label>Seats</Label>
                <Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
              </div>
              <Button
              onClick={async () => {
                  await save("routes", form, `Saved route ${form.name}.`);
                  setOpen(false);
                }}
              >
                Save route
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Guard>
  );
}
