"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";

export default function LoginPage() {
  const { ready, user, login, registerAdmin, needsSetup } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "setup">("in");
  const view = mode;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/app");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const msg =
      view === "setup"
        ? await registerAdmin({ name, email, password, phone })
        : await login(email, password);
    setBusy(false);
    if (msg) setError(msg);
    else router.replace("/app");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-16 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-secondary/30 to-transparent" />
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-secondary">PHARMACY COLLEGE ERP</p>
          <h1 className="mt-4 max-w-md font-heading text-4xl font-semibold leading-tight">
            GP Pharmacy College
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-secondary/90">
            Sign in with your office account, or create the first admin. Every student, staff, and fee record
            you save is live college data.
          </p>
        </div>
        <ul className="grid max-w-md gap-3 text-sm text-sidebar-foreground/85">
          <li className="border-l-2 border-secondary pl-3">Student and staff files with photos</li>
          <li className="border-l-2 border-secondary pl-3">Department, course, and section lists</li>
          <li className="border-l-2 border-secondary pl-3">Class, exams, fees, library, and transport</li>
        </ul>
      </section>

      <section className="flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary">GP PHARMACY COLLEGE</p>
            <CardTitle className="text-2xl text-primary">
              {view === "setup" ? "Create admin account" : "Sign in"}
            </CardTitle>
            <CardDescription>
              {view === "setup"
                ? "This first account controls the college ERP. Use your real office email."
                : needsSetup
                  ? "If you already created an admin, sign in here. This browser may be empty until cloud login succeeds."
                  : "Use the email and password created for you by the college office."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              {view === "setup" ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Office phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={view === "setup" ? 8 : 1}
                  autoComplete={view === "setup" ? "new-password" : "current-password"}
                />
              </div>
              {error ? <p className="text-sm text-primary">{error}</p> : null}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Please wait…" : view === "setup" ? "Create admin and open ERP" : "Sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground underline"
                onClick={() => {
                  setMode(view === "setup" ? "in" : "setup");
                  setError(null);
                }}
              >
                {view === "setup" ? "Already have an account? Sign in" : "First time? Create the admin account"}
              </button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
