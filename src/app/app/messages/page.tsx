"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/app-context";
import { uid } from "@/lib/storage";

export default function MessagesPage() {
  const { state, mutate, allowed, user } = useApp();
  const canWrite = allowed("messages", "write");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [audience, setAudience] = useState("All");

  return (
    <Guard module="messages">
      <PageHeader
        title="Message portal"
        note="College announcements live here. Urgent notes show a red tag so parents and students see them first."
      />
      {canWrite ? (
        <div className="mb-6 space-y-3 rounded-xl border border-[#F0C94A] bg-white p-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(Boolean(v))} />
              Urgent academic alert
            </label>
            <Input
              className="max-w-xs"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Audience, e.g. Students"
            />
          </div>
          <Button
            className="bg-[#C41E3A] text-white"
            disabled={!title || !body}
            onClick={() => {
              mutate((draft) => {
                draft.messages.unshift({
                  id: uid("msg"),
                  title,
                  body,
                  urgent,
                  fromUserId: user?.id ?? "u1",
                  audience,
                  createdAt: new Date().toISOString(),
                });
                return `Posted message "${title}" to ${audience}.`;
              }, "messages", title);
              setTitle("");
              setBody("");
            }}
          >
            Post message
          </Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {state.messages.map((m) => (
          <article key={m.id} className={`rounded-xl border p-4 ${m.urgent ? "border-[#C41E3A] bg-[#FFF1F2]" : "border-[#F0C94A] bg-white"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-[#8B1528]">{m.title}</h2>
              {m.urgent ? <Badge className="bg-[#C41E3A]">Urgent</Badge> : null}
              <span className="text-xs text-[#6B4A1F]">{m.audience}</span>
            </div>
            <p className="mt-1 text-sm">{m.body}</p>
            <p className="mt-2 text-xs text-[#6B4A1F]">{new Date(m.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </Guard>
  );
}
