"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Library, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";

const ITEMS = [
  { href: "/library", label: "Dashboard", icon: Library },
  { href: "/library", label: "Catalogue & issue", icon: BookOpen },
];

export default function LibrarianLayout({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "librarian") router.replace(user ? portalHome(user.role) : "/");
  }, [ready, user, router]);

  if (!ready || user?.role !== "librarian") {
    return (
      <div className="min-h-dvh bg-[#f5f6fa] p-6">
        <LoadingState label={!ready ? "Checking your session…" : "Opening the library…"} />
      </div>
    );
  }

  function signOut() {
    logout();
    router.replace("/");
  }

  return (
    <div className="min-h-dvh bg-[#f5f6fa] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[#e6e9ef] bg-white px-3 py-4 md:flex">
        <div className="mb-4 px-2">
          <BrandMark />
          <p className="mt-2 text-[11px] font-medium text-[#8b93a7]">Librarian Portal</p>
        </div>
        <p className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-[#8b93a7] uppercase">Library</p>
        <nav className="flex flex-col gap-0.5">
          {ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium ${active ? "bg-[#e7f0ff] text-[#1b6de0]" : "text-[#3e4657] hover:bg-[#f4f6f9]"}`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-[#e6e9ef] px-2 pt-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#e7f0ff] text-sm font-bold text-[#1b6de0]">{user.name.slice(0, 1)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-[11px] text-[#8b93a7]">Librarian</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e6e9ef] bg-white px-4">
          <p className="text-sm font-semibold text-[#1f2533]">Library</p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
