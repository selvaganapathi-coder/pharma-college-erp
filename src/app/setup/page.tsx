"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";

export default function FirstAdminSetupPage() {
  const { ready, user, registerAdmin, needsSetup } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (user) router.replace(portalHome(user.role));
    else if (!needsSetup) router.replace("/");
  }, [ready, user, needsSetup, router]);

  if (!ready || !needsSetup || user) {
    return <p className="p-8 text-sm text-muted-foreground">Checking college setup…</p>;
  }

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
        <p className="mt-1 text-sm text-muted-foreground">
          This page is only available until the first administrator exists. It is not public registration.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Office phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" />
          </div>
          {error ? <p className="text-sm text-primary" role="alert">{error}</p> : null}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-primary font-semibold text-white hover:bg-[#8f1c14]">
            {busy ? "Please wait…" : "Create first administrator"}
          </Button>
        </form>
      </div>
    </div>
  );
}
