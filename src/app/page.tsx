"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark } from "@/components/brand-mark";
import { useApp } from "@/lib/app-context";
import { firebaseResetPassword } from "@/lib/firebase";
import { accessDeniedMessage, loginPortalMatchesRole, portalHome, type LoginPortal } from "@/lib/portals";
import { COLLEGE_NAME, COLLEGE_TAGLINE } from "@/lib/brand";

const PORTALS: { id: LoginPortal; label: string }[] = [
  { id: "office", label: "Admin / Staff" },
  { id: "student", label: "Student" },
  { id: "parent", label: "Parent" },
];

export default function LoginPage() {
  const { ready, user, login } = useApp();
  const router = useRouter();
  const [portal, setPortal] = useState<LoginPortal>("office");
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("gp-login-email") ?? ""));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    const result = await login(email, password);
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
    <div className="grid min-h-dvh bg-background md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] lg:grid-cols-2">
      <section className="order-2 flex items-center justify-center px-4 py-8 md:order-1 md:py-12">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_50px_rgba(90,20,16,0.08)] sm:p-8">
          <BrandMark size="lg" />
          <h1 className="mt-7 text-3xl font-semibold tracking-tight text-primary">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          <div className="mt-5 grid grid-cols-3 rounded-full bg-muted p-1 text-[11px] font-semibold sm:text-xs">
            {PORTALS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPortal(item.id)}
                className={`min-h-10 rounded-full px-1 py-2 sm:px-2 ${
                  portal === item.id ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email / ID</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="h-11 rounded-xl"
                placeholder="you@college.edu"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={1}
                  autoComplete="current-password"
                  className="h-11 rounded-xl pr-11"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
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
            {error ? (
              <p className="text-sm whitespace-pre-line text-primary" role="alert">
                {error}
              </p>
            ) : null}
            {resetNote ? <p className="text-sm text-muted-foreground">{resetNote}</p> : null}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-white hover:bg-[#8f1c14]">
              {busy ? "Please wait…" : "Sign In"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {portal === "student"
                ? "Use the student email issued by the college office."
                : portal === "parent"
                  ? "Use the parent email recorded on the student file."
                  : "Use the office account issued to you."}
            </p>
          </form>
        </div>
      </section>
      <aside className="relative order-1 h-[148px] overflow-hidden sm:h-[180px] md:order-2 md:h-auto md:min-h-dvh">
        <Image
          src="/images/login/pharmacy-campus.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-[center_22%] md:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#4a0f12]/70 via-[#4a0f12]/15 to-transparent md:bg-gradient-to-t md:from-[#4a0f12]/55 md:via-transparent" />
        <div className="absolute right-4 bottom-4 left-4 hidden md:block">
          <p className="text-sm font-semibold text-white">{COLLEGE_NAME}</p>
          <p className="text-[11px] tracking-[0.18em] text-[#f0c419] uppercase">{COLLEGE_TAGLINE}</p>
        </div>
      </aside>
    </div>
  );
}
