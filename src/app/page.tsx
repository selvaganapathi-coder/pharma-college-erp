"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, GraduationCap, Shield, UserRound, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";
import { COLLEGE_NAME, COLLEGE_TAGLINE } from "@/lib/brand";
import type { Role } from "@/lib/types";

const ENTRIES: { role: Role; label: string; note: string; icon: typeof Shield }[] = [
  { role: "admin", label: "Admin", note: "Office dashboard", icon: Shield },
  { role: "staff", label: "Staff", note: "Classes and attendance", icon: Users },
  { role: "student", label: "Student", note: "Classes, fees, and notices", icon: GraduationCap },
  { role: "parent", label: "Parent", note: "Your child's portal", icon: UserRound },
  { role: "librarian", label: "Librarian", note: "Catalogue, issue, and return", icon: BookOpen },
];

export default function LoginPage() {
  const { ready, user, openPortal } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace(portalHome(user.role));
  }, [ready, user, router]);

  function enter(role: Role) {
    openPortal(role);
    router.replace(portalHome(role));
  }

  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] lg:grid-cols-2">
      <section className="order-2 flex items-center justify-center px-4 py-8 md:order-1 md:py-12">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(90,20,16,0.08)] sm:p-8">
          <BrandMark size="lg" />
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-primary sm:mt-7 sm:text-3xl">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          <p className="mt-4 text-sm text-muted-foreground">Choose a portal. No email or password is needed for now.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {ENTRIES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => enter(item.role)}
                  className={`flex min-h-28 flex-col items-start justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:border-primary hover:bg-primary hover:text-white ${item.role === "librarian" ? "col-span-2" : ""}`}
                >
                  <Icon className="size-5" />
                  <span>
                    <span className="block text-base font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs opacity-80">{item.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
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
        <div className="absolute right-3 bottom-3 left-3 md:right-4 md:bottom-4 md:left-4">
          <p className="text-sm font-semibold text-white">{COLLEGE_NAME}</p>
          <p className="text-[11px] tracking-[0.18em] text-[#f0c419] uppercase">{COLLEGE_TAGLINE}</p>
        </div>
      </aside>
    </div>
  );
}
