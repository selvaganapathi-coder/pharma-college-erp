"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";

export default function TransportPage() {
  const { state, mutate, allowed, scopedStudentId } = useApp();
  const sid = scopedStudentId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driver, setDriver] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [stops, setStops] = useState("");
  const [seats, setSeats] = useState("30");

  return (
    <Guard module="transport">
      <PageHeader
        title="Transport"
        note="Bus routes, drivers, and who sits on each bus. Students see their own route."
        action={
          allowed("transport", "write") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button className="bg-[#C41E3A] text-white" />}>Add route</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New bus route</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Route name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Vehicle number</Label>
                    <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Driver</Label>
                    <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Driver phone</Label>
                    <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Stops</Label>
                    <Input value={stops} onChange={(e) => setStops(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Seats</Label>
                    <Input value={seats} onChange={(e) => setSeats(e.target.value)} />
                  </div>
                  <Button
                    className="bg-[#C41E3A] text-white"
                    onClick={() => {
                      mutate((draft) => {
                        draft.routes.push({
                          id: uid("r"),
                          name,
                          vehicleNo,
                          driver,
                          driverPhone,
                          stops,
                          seats: Number(seats) || 0,
                        });
                        return `Added bus route ${name}.`;
                      }, "transport", name);
                      setOpen(false);
                    }}
                  >
                    Save route
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {state.routes
          .filter((r) => {
            if (!sid) return true;
            return state.students.find((s) => s.id === sid)?.busRouteId === r.id;
          })
          .map((r) => {
            const riders = state.students.filter((s) => s.busRouteId === r.id);
            return (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-[#8B1528]">{r.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    Bus {r.vehicleNo} · {r.seats} seats
                  </p>
                  <p>
                    Driver {r.driver} · {r.driverPhone}
                  </p>
                  <p className="text-[#6B4A1F]">Stops: {r.stops}</p>
                  <div className="flex flex-wrap gap-1">
                    {riders.length === 0 ? <span>No students on this route yet.</span> : null}
                    {riders.map((s) => (
                      <Badge key={s.id} variant="outline">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </Guard>
  );
}
