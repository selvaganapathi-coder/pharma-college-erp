"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ClipboardList, Library, LogOut, Users, Undo2, Settings, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { portalHome } from "@/lib/portals";
import { LibraryDesk } from "@/components/library/library-desk";

function libraryView(pathname: string) {
  if (pathname.startsWith("/library/catalog")) return "catalog" as const;
  if (pathname.startsWith("/library/members")) return "members" as const;
  if (pathname.startsWith("/library/circulation")) return "circulation" as const;
  if (pathname.startsWith("/library/rules")) return "rules" as const;
  if (pathname.startsWith("/library/reports")) return "reports" as const;
  if (pathname.startsWith("/library/guide")) return "guide" as const;
  return "dashboard" as const;
}

const ITEMS = [
  { href: "/library", label: "Dashboard", icon: Library },
  { href: "/library/catalog", label: "Catalog", icon: BookOpen },
  { href: "/library/members", label: "Members", icon: Users },
  { href: "/library/circulation", label: "Circulation", icon: Undo2 },
  { href: "/library/rules", label: "Rules", icon: Settings },
  { href: "/library/reports", label: "Reports", icon: FileBarChart },
  { href: "/library/guide", label: "Guide", icon: ClipboardList },
];

export default function LibrarianLayout({ children }: { children: ReactNode }) {
  const { ready, user, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [section, setSection] = useState<ReturnType<typeof libraryView> | null>(null);
  const shown = section ?? libraryView(pathname);

  useEffect(() => {
    const sync = () => setSection(libraryView(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function show(href: string) {
    const next = libraryView(href);
    setSection(next);
    if (window.location.pathname !== href) window.history.pushState(null, "", href);
  }

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
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = libraryView(item.href) === shown;
            return (
              <button key={item.href} type="button" onClick={() => show(item.href)} className={`flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium ${active ? "bg-[#e7f0ff] text-[#1b6de0]" : "text-[#3e4657] hover:bg-[#f4f6f9]"}`}>
                <Icon className="size-4" />
                {item.label}
              </button>
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
        <header className="sticky top-0 z-30 border-b border-[#e6e9ef] bg-white">
          <div className="flex h-14 items-center justify-between px-4">
            <p className="text-sm font-semibold text-[#1f2533]">Library</p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="size-4" />
              Log out
            </Button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Library pages">
            {ITEMS.map((item) => {
              const active = libraryView(item.href) === shown;
              return (
                <button key={item.href} type="button" onClick={() => show(item.href)} className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-[#e7f0ff] text-[#1b6de0]" : "text-[#3e4657]"}`}>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>
        <main className="p-4 md:p-6">
          <LibraryDesk mode="desk" view={shown} onNavigate={(next) => show(next === "dashboard" ? "/library" : `/library/${next}`)} />
          {children}
        </main>
      </div>
    </div>
  );
}
