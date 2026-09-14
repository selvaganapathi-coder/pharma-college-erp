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

  useEffect(() => {
    if (ready && user) router.replace("/app");
  }, [ready, user, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = login(email, password);
    if (msg) setError(msg);
    else router.replace("/app");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#C41E3A_0%,#9B1B30_42%,#EAB308_100%)] px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="text-white">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#FDE68A]">COLLEGE ERP</p>
          <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">GP Pharmacy College</h1>
          <p className="mt-4 max-w-lg text-base text-white/90">
            One simple place for students, parents, and staff. Check class, attendance, exam marks, fees,
            library books, and bus routes. Get WhatsApp, SMS, email, and in-app alerts.
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-[#FFF3C4] sm:grid-cols-2">
            <li>Student and staff records</li>
            <li>Courses, departments, sections</li>
            <li>Timetable and attendance</li>
            <li>Exam marks and reports</li>
            <li>Safe fee payment</li>
            <li>Library and transport</li>
          </ul>
        </div>

        <Card className="border-[#F0C94A] shadow-xl">
          <CardHeader>
            <CardTitle className="text-[#8B1528]">Sign in</CardTitle>
            <CardDescription>Pick who you are, then use the demo password.</CardDescription>
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
              <Button type="submit" className="w-full bg-[#C41E3A] text-white hover:bg-[#9B1B30]">
                Open my dashboard
              </Button>
              <p className="text-center text-xs text-[#6B4A1F]">Demo password for all roles: college123</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
