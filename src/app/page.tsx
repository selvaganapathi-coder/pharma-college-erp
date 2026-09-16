"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark } from "@/components/brand-mark";
import { useApp } from "@/lib/app-context";
import { firebaseResetPassword } from "@/lib/firebase";
import { accessDeniedMessage, loginPortalMatchesRole, portalHome, type LoginPortal } from "@/lib/portals";
import { COLLEGE_NAME, COLLEGE_SYSTEM, COLLEGE_TAGLINE } from "@/lib/brand";

const PORTALS: { id: LoginPortal; label: string }[] = [
  { id: "office", label: "Admin/Staff" },
  { id: "student", label: "Student" },
  { id: "parent", label: "Parent" },
];

export default function LoginPage() {
  const { ready, user, login, registerAdmin, needsSetup } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "setup">("in");
  const [portal, setPortal] = useState<LoginPortal>("office");
  const view = mode;
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("gp-login-email") ?? ""));
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [resetNote, setResetNote] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(portalHome(user.role));
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResetNote(null);
    const result =
      view === "setup"
        ? { error: await registerAdmin({ name, email, password, phone }), role: "admin" as const }
        : await login(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else {
      if (remember) localStorage.setItem("gp-login-email", email.trim().toLowerCase());
      else localStorage.removeItem("gp-login-email");
      const role = result.role ?? user?.role;
      if (role && !loginPortalMatchesRole(portal, role)) {
        setError(accessDeniedMessage(role));
      }
      if (role) router.replace(portalHome(role));
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 erp-shadow">
          <BrandMark />
          <h1 className="mt-8 text-3xl font-semibold text-primary">Welcome to {COLLEGE_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{COLLEGE_SYSTEM}</p>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{COLLEGE_TAGLINE}</p>
          {view === "in" ? (
            <div className="mt-5 grid grid-cols-3 rounded-full bg-muted p-1 text-xs font-semibold">
              {PORTALS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPortal(item.id)}
                  className={`rounded-full px-2 py-2 ${
                    (item.id === "office" ? portal === "office" : portal === item.id)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <form onSubmit={submit} className="mt-6 space-y-3">
            {view === "setup" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Office phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="h-11 rounded-xl" placeholder="you@college.edu" />
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
                className="h-11 rounded-xl"
              />
            </div>
            {view === "in" ? (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} /> Remember me
                </label>
                <button
                  type="button"
                  className="font-medium text-primary"
                  onClick={async () => {
                    if (!email) {
                      setError("Enter your email first, then request a reset.");
                      return;
                    }
                    const out = await firebaseResetPassword(email.trim().toLowerCase());
                    setError(out.ok ? null : out.note);
                    setResetNote(out.ok ? out.note : null);
                  }}
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
            {error ? <p className="text-sm text-primary" role="alert">{error}</p> : null}
            {resetNote ? <p className="text-sm text-muted-foreground">{resetNote}</p> : null}
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl text-base">
              {busy ? "Please wait…" : view === "setup" ? "Create admin and open ERP" : "Sign In"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {portal === "student"
                ? "Students sign in with the email the office used when creating the portal login."
                : portal === "parent"
                  ? "Parents sign in with the parent email on the student file."
                  : needsSetup
                    ? "If you already created an admin, sign in here."
                    : "Use the office account created for you."}
            </p>
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
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(228,180,34,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-sidebar-foreground">
          <p className="max-w-sm text-5xl font-semibold leading-[1.05] tracking-tight">
            Research Today
            <br />
            Healthier
            <br />
            Tomorrows
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Quality Education", "Modern Infrastructure", "Experienced Faculty", "Industry Exposure"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-sidebar">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs tracking-[0.2em] text-secondary uppercase">{COLLEGE_NAME}</p>
        </div>
      </section>
    </div>
  );
}
