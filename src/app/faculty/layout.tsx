"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";

export default function FacultyLayout({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "faculty") router.replace(user ? portalHome(user.role) : "/");
  }, [ready, user, router]);

  if (!ready || user?.role !== "faculty") {
    return (
      <div className="min-h-dvh bg-[#f5f6fa] p-6">
        <LoadingState label={!ready ? "Checking your session…" : "Opening the faculty library…"} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f5f6fa] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[#e6e9ef] bg-white px-3 py-4 md:flex">
        <div className="mb-4 px-2">
          <BrandMark />
          <p className="mt-2 text-[11px] font-medium text-[#8b93a7]">Faculty</p>
        </div>
        <Link href="/faculty" className="flex min-h-9 items-center gap-2.5 rounded-md bg-[#e7f0ff] px-3 text-[13px] font-medium text-[#1b6de0]">
          <BookOpen className="size-4" />
          Catalog and loans
        </Link>
        <div className="mt-auto border-t border-[#e6e9ef] px-2 pt-3 text-sm font-semibold">{user.name}</div>
      </aside>
      <div>
        <header className="flex h-14 items-center justify-between border-b border-[#e6e9ef] bg-white px-4">
          <p className="text-sm font-semibold">Faculty library</p>
          <Button variant="outline" onClick={() => { logout(); router.replace("/"); }}><LogOut className="size-4" /> Log out</Button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
