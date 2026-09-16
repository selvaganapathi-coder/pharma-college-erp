"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { StatCard } from "@/components/stat-card";
import { AlertCard, severityRank } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { SectionSelect, StudentSelect } from "@/components/linked-selects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/store";
import { pick } from "@/lib/pick";
import type { AlertSeverity, Channel, Notice } from "@/lib/types";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "inapp", label: "In-app" },
  { id: "whatsapp", label: "WhatsApp (MSG91)" },
  { id: "sms", label: "SMS (MSG91)" },
  { id: "email", label: "Email" },
];

export default function AlertsPage() {
  const { state, save, allowed, user, authHeader } = useApp();
  const canWrite = allowed("notices", "write");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("INFO");
  const [channels, setChannels] = useState<Channel[]>(["inapp"]);
  const [audience, setAudience] = useState("All");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [q, setQ] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const notices = useMemo(() => {
    return [...state.notices]
      .filter((n) => !n.archived)
      .filter((n) => !q || `${n.title} ${n.body}`.toLowerCase().includes(q.toLowerCase()))
      .filter((n) => sevFilter === "all" || (n.severity ?? (n.urgent ? "URGENT" : "INFO")) === sevFilter)
      .filter((n) => {
        const unread = !(n.readBy ?? []).includes(user?.id ?? "");
        if (readFilter === "unread") return unread;
        if (readFilter === "read") return !unread;
        return true;
      })
      .sort(
        (a, b) =>
          severityRank((a.severity ?? "INFO") as AlertSeverity) - severityRank((b.severity ?? "INFO") as AlertSeverity),
      );
  }, [state.notices, q, sevFilter, readFilter, user?.id]);

  const today = new Date().toISOString().slice(0, 10);

  async function send() {
    setBusy(true);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, channels, studentId, sectionId }),
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
        urgent: severity === "URGENT",
        severity,
        createdAt: new Date().toISOString(),
        createdBy: user?.id ?? "",
        createdByName: user?.name,
        status: data.ok && (data.failed ?? []).length === 0 ? (data.delivered?.length ? "sent" : "not_configured") : "failed",
        deliveryNote: data.note,
        readBy: [],
      };
      if (!data.ok) toast.error(data.note ?? "Alert was not delivered.");
      else if ((data.notConfigured ?? []).length) toast.message(data.note);
      else toast.success("In-app alert stored. Provider channels reported success only if configured.");
      await save("notices", notice, `Alert "${title}" (${severity}).`);
      setTitle("");
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Guard module="notices">
      <PageHeader
        title="Alerts"
        note="Office alerts with severity. SMS/WhatsApp send only to a selected student's phone on file. Email needs SMTP. Success is never shown unless the provider actually accepted the message."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total alerts" value={`${state.notices.filter((n) => !n.archived).length}`} />
        <StatCard title="Urgent" value={`${state.notices.filter((n) => n.severity === "URGENT" || n.urgent).length}`} />
        <StatCard title="Unread for you" value={`${state.notices.filter((n) => !(n.readBy ?? []).includes(user?.id ?? "")).length}`} />
        <StatCard title="Created today" value={`${state.notices.filter((n) => n.createdAt.slice(0, 10) === today).length}`} />
      </div>
      {canWrite ? (
        <div className="mb-6 space-y-3 rounded-2xl bg-card p-4 erp-card">
          <div className="space-y-1">
            <Label htmlFor="alert-title">Title</Label>
            <Input id="alert-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="alert-body">Message</Label>
            <Textarea id="alert-body" value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={pick((v) => setSeverity(v as AlertSeverity))} items={{ INFO: "INFO", SUCCESS: "SUCCESS", WARNING: "WARNING", ERROR: "ERROR", URGENT: "URGENT" }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["INFO", "SUCCESS", "WARNING", "ERROR", "URGENT"] as const).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Audience</Label>
              <Select value={audience} onValueChange={pick(setAudience)} items={{ All: "All", Students: "Students", Parents: "Parents", Staff: "Staff", Section: "One section", Student: "One student" }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            {audience === "Section" ? <SectionSelect sections={state.sections} value={sectionId} onChange={setSectionId} /> : null}
            {audience === "Student" ? (
              <StudentSelect
                students={state.students.filter((s) => !s.deletedAt).map((s) => ({ id: s.id, name: s.name, rollNo: s.rollNo }))}
                value={studentId}
                onChange={setStudentId}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-4">
            {CHANNELS.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm">
                <Checkbox checked={channels.includes(c.id)} onCheckedChange={(v) => setChannels((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))} />
                {c.label}
              </label>
            ))}
          </div>
          <Button className="min-h-11" disabled={!title || !body || busy} onClick={() => void send()}>
            {busy ? "Sending…" : "Send alert"}
          </Button>
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alerts" className="min-h-11" aria-label="Search alerts" />
        <Select value={sevFilter} onValueChange={pick(setSevFilter)}>
          <SelectTrigger className="min-h-11"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {(["URGENT", "ERROR", "WARNING", "INFO", "SUCCESS"] as const).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={pick(setReadFilter)}>
          <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        {notices.length === 0 ? (
          <EmptyState title="No alerts" description="Nothing matches the current filters, or no alerts have been sent yet." />
        ) : (
          notices.map((n) => (
            <AlertCard
              key={n.id}
              notice={n}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() =>
                    void save("notices", { ...n, readBy: [...new Set([...(n.readBy ?? []), user?.id ?? ""])] }, `Read alert ${n.title}.`)
                  }
                >
                  Mark as read
                </Button>
              }
            />
          ))
        )}
      </div>
    </Guard>
  );
}
