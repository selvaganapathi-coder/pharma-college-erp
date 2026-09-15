"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SectionSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import type { Channel, Notice } from "@/lib/types";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "inapp", label: "In-app" },
  { id: "whatsapp", label: "WhatsApp (MSG91)" },
  { id: "sms", label: "SMS (MSG91)" },
  { id: "email", label: "Email" },
];

export default function AlertsPage() {
  const { state, save, remove, allowed, user } = useApp();
  const canWrite = allowed("notices", "write");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(["inapp", "sms", "whatsapp", "email"]);
  const [audience, setAudience] = useState("All");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");

  async function send() {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, channels, urgent, sectionId, studentId }),
    });
    const data = await res.json();
    const notice: Notice = {
      id: uid("n"),
      title,
      body,
      channels,
      audience,
      sectionId: sectionId || undefined,
      studentId: studentId || undefined,
      urgent,
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? "u1",
      status: data.ok ? "sent" : "queued",
      deliveryNote: data.note,
    };
    await save("notices", notice, `Sent alert "${title}" on ${channels.join(", ")}.`);
    toast.success(data.note);
    setTitle("");
    setBody("");
  }

  return (
    <Guard module="notices">
      <PageHeader
        title="Alerts"
        note="Send WhatsApp, SMS, email, and in-app in one go. Pick all, a section, or one student. MSG91 and SMTP send live when keys are set; otherwise the alert is stored and queued."
      />
      {canWrite ? (
        <div className="mb-6 space-y-3 rounded-xl border-2 border-[#C41E3A] bg-[#FFF8C2] p-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={pick(setAudience)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Students">Students</SelectItem>
                  <SelectItem value="Parents">Parents</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Section">One section</SelectItem>
                  <SelectItem value="Student">One student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audience === "Section" ? (
              <SectionSelect sections={state.sections} value={sectionId} onChange={setSectionId} />
            ) : null}
            {audience === "Student" ? (
              <div className="space-y-1">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={pick(setStudentId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-4">
            {CHANNELS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={channels.includes(c.id)}
                  onCheckedChange={(v) => setChannels((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                />
                {c.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(Boolean(v))} />
              Urgent
            </label>
          </div>
          <Button className="bg-[#C41E3A] text-[#FFE566]" disabled={!title || !body} onClick={() => void send()}>
            Send alert
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {state.notices.map((n) => (
          <article key={n.id} className="rounded-xl border-2 border-[#C41E3A] bg-[#FFF8C2] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{n.title}</h2>
              {n.urgent ? <Badge className="bg-[#C41E3A] text-[#FFE566]">Urgent</Badge> : null}
              <Badge variant="outline">{n.status}</Badge>
              {canWrite ? (
                <Button size="sm" variant="ghost" onClick={() => void remove("notices", n.id, `Deleted alert ${n.title}.`)}>
                  Delete
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-sm">{n.body}</p>
            <p className="mt-2 text-xs">
              {n.channels.join(" · ")} · {n.audience} · {new Date(n.createdAt).toLocaleString()} · {n.deliveryNote}
            </p>
          </article>
        ))}
      </div>
    </Guard>
  );
}
