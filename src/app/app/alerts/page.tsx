"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";
import type { Channel } from "@/lib/types";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "inapp", label: "In-app" },
  { id: "whatsapp", label: "WhatsApp (MSG91)" },
  { id: "sms", label: "SMS (MSG91)" },
  { id: "email", label: "Email" },
];

export default function AlertsPage() {
  const { state, mutate, allowed, user } = useApp();
  const canWrite = allowed("notices", "write");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(["inapp", "sms"]);

  async function send() {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, channels, urgent }),
    });
    const data = await res.json();
    mutate((draft) => {
      draft.notices.unshift({
        id: uid("n"),
        title,
        body,
        channels,
        audience: ["all"],
        urgent,
        createdAt: new Date().toISOString(),
        createdBy: user?.id ?? "u1",
        status: data.ok ? "sent" : "queued",
        deliveryNote: data.note,
      });
      return `Sent alert "${title}" on ${channels.join(", ")}.`;
    }, "notices", title);
    toast.success(data.note);
    setTitle("");
    setBody("");
  }

  return (
    <Guard module="notices">
      <PageHeader
        title="Alerts"
        note="Send the same note on WhatsApp, SMS, email, and the app. MSG91 keys go in Settings. If keys are missing, the alert is saved here and queued."
      />
      {canWrite ? (
        <div className="mb-6 space-y-3 rounded-xl border border-[#F0C94A] bg-white p-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write in easy words." />
          </div>
          <div className="flex flex-wrap gap-4">
            {CHANNELS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes(c.id)}
                  onCheckedChange={(v) =>
                    setChannels((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                  }
                />
                {c.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(Boolean(v))} />
              Urgent
            </label>
          </div>
          <Button className="bg-[#C41E3A] text-white" disabled={!title || !body} onClick={send}>
            Send alert
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {state.notices.map((n) => (
          <article key={n.id} className="rounded-xl border border-[#F0C94A] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[#8B1528]">{n.title}</h2>
              {n.urgent ? <Badge className="bg-[#C41E3A]">Urgent</Badge> : null}
              <Badge variant="outline">{n.status}</Badge>
            </div>
            <p className="mt-1 text-sm">{n.body}</p>
            <p className="mt-2 text-xs text-[#6B4A1F]">
              {n.channels.join(" · ")} · {new Date(n.createdAt).toLocaleString()} · {n.deliveryNote}
            </p>
          </article>
        ))}
      </div>
    </Guard>
  );
}
