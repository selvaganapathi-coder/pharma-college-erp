"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApp } from "@/lib/app-context";
import type { Role } from "@/lib/types";

const DEMOS: { role: Role; email: string; label: string; note: string; icon: typeof Shield }[] = [
  { role: "admin", email: "admin@gppharmacy.edu", label: "I am admin", note: "All college data", icon: Shield },
  { role: "staff", email: "staff@gppharmacy.edu", label: "I am staff", note: "Class and marks", icon: Users },
  { role: "student", email: "student@gppharmacy.edu", label: "I am a student", note: "My class and fees", icon: GraduationCap },
  { role: "parent", email: "parent@gppharmacy.edu", label: "I am a parent", note: "My child's updates", icon: Heart },
];

export default function LoginPage() {
  const { ready, user, login } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("admin@gppharmacy.edu");
  const [password, setPassword] = useState("college123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/app");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const msg = await login(email, password);
    setBusy(false);
    if (msg) setError(msg);
    else router.replace("/app");
  }

  return (
    <div className="min-h-screen bg-[#FFE566] px-4 py-8 text-[#C41E3A]">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-bold tracking-[0.2em]">COLLEGE ERP</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">GP Pharmacy College</h1>
          <p className="mt-4 max-w-lg text-base">
            Full college ERP: student and staff files with photos, live department → course → section lists, timetable,
            attendance, exams, fees with receipt, library, bus, alerts, and audit logs.
          </p>
          <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
            <li>Full CRUD student and staff files + photos</li>
            <li>Live department, course, section lists</li>
            <li>Timetable editor, attendance, exams</li>
            <li>Fees, receipts, library, bus</li>
            <li>WhatsApp / SMS / email / in-app alerts</li>
            <li>Reports and audit logs</li>
          </ul>
        </div>

        <Card className="border-2 border-[#C41E3A] bg-[#FFF8C2] shadow-xl">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription className="text-[#C41E3A]">Pick who you are, then use the password.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {DEMOS.map((d) => {
                const Icon = d.icon;
                const active = email === d.email;
                return (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("college123");
                      setError(null);
                    }}
                    className={`rounded-xl border p-3 text-left text-sm ${
                      active ? "border-[#C41E3A] bg-[#FFF3C4]" : "border-[#F0C94A] bg-white"
                    }`}
                  >
                    <Icon className="mb-1 size-4 text-[#C41E3A]" />
                    <p className="font-semibold text-[#7A1F1F]">{d.label}</p>
                    <p className="text-xs text-[#6B4A1F]">{d.note}</p>
                  </button>
                );
              })}
            </div>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error ? <p className="text-sm text-[#C41E3A]">{error}</p> : null}
              <Button type="submit" disabled={busy} className="w-full bg-[#C41E3A] text-white hover:bg-[#9B1B30]">
                {busy ? "Signing in…" : "Open my dashboard"}
              </Button>
              <p className="text-center text-xs text-[#6B4A1F]">
                Demo password for all roles: college123. Cloud save uses Firebase project pharmacy-98684. MSG91 is
                not on yet.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
