"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";

export default function FirstAdminSetupPage() {
  const { ready, user, registerAdmin } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"checking" | "open" | "closed">("checking");
  const [note, setNote] = useState("Checking whether the college already has an administrator.");

  useEffect(() => {
    if (ready && user) router.replace(portalHome(user.role));
  }, [ready, user, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data: { open?: boolean; note?: string }) => {
        if (cancelled) return;
        setPhase(data.open ? "open" : "closed");
        setNote(data.note ?? (data.open ? "" : "An administrator already exists. Sign in."));
      })
      .catch(() => {
        if (cancelled) return;
        setPhase("closed");
        setNote("Setup is closed because the server could not verify the college lock.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const errorNote = await registerAdmin({ name, email, password, phone });
    setBusy(false);
    if (errorNote) setError(errorNote);
    else router.replace("/app");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 shadow-[0_18px_50px_rgba(90,20,16,0.08)]">
        <BrandMark size="md" />
        <h1 className="mt-6 text-2xl font-semibold text-primary">Office bootstrap</h1>
        {phase === "checking" ? (
          <div className="mt-6">
            <LoadingState label="Checking college setup…" />
          </div>
        ) : null}
        {phase === "closed" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground" role="status">
              {note}
            </p>
            <Button className="h-11 w-full rounded-xl" onClick={() => router.replace("/")}>
              Back to sign in
            </Button>
          </div>
        ) : null}
        {phase === "open" ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              This page creates the first administrator through the server. It closes as soon as an administrator exists.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" />
              </div>
              {error ? (
                <p className="text-sm text-primary" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                {busy ? "Creating…" : "Create administrator"}
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
