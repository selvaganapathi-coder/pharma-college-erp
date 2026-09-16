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
import { uid } from "@/lib/store";
import { toast } from "sonner";

export default function MessagesPage() {
  const { state, save, remove, allowed, user } = useApp();
  const canWrite = allowed("messages", "write");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [audience, setAudience] = useState("All");

  return (
    <Guard module="messages">
      <PageHeader
        title="Message portal"
        note="College announcements. Urgent notes show a red tag. Staff can post, edit by posting again, or delete."
      />
      {canWrite ? (
        <div className="mb-6 space-y-3 rounded-xl border border-border p-4">
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
            <Input className="max-w-xs bg-card" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </div>
          <Button
            disabled={!title || !body}
            onClick={async () => {
              await save(
                "messages",
                {
                  id: uid("msg"),
                  title,
                  body,
                  urgent,
                  fromUserId: user?.id ?? "",
                  audience,
                  createdAt: new Date().toISOString(),
                },
                `Posted message "${title}".`,
              );
              toast.success("Message posted.");
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
          <article
            key={m.id}
            className={`rounded-xl border-2 p-4 ${m.urgent ? "border-border bg-destructive/10" : "border-border"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{m.title}</h2>
              {m.urgent ? <Badge>Urgent</Badge> : null}
              <span className="text-xs">{m.audience}</span>
              {canWrite ? (
                <Button size="sm" variant="ghost" onClick={() => void remove("messages", m.id, `Deleted message ${m.title}.`)}>
                  Delete
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-sm">{m.body}</p>
            <p className="mt-2 text-xs">{new Date(m.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </Guard>
  );
}
