"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Shield,
  Users,
  Building2,
  Layers,
  FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { useApp } from "@/lib/app-context";
import { can, roleLabel, type ModuleKey } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

const GROUPS: { title: string; items: { href: string; label: string; module: ModuleKey; icon: typeof LayoutDashboard }[] }[] = [
  {
    title: "Academic",
    items: [
      { href: "/app", label: "Dashboard", module: "departments", icon: LayoutDashboard },
      { href: "/app/students", label: "Students", module: "students", icon: GraduationCap },
      { href: "/app/staff", label: "Staff", module: "staff", icon: Users },
      { href: "/app/departments", label: "Departments", module: "departments", icon: Building2 },
      { href: "/app/courses", label: "Courses", module: "courses", icon: BookOpen },
      { href: "/app/sections", label: "Sections", module: "sections", icon: Layers },
      { href: "/app/timetable", label: "Timetable", module: "timetable", icon: CalendarDays },
      { href: "/app/attendance", label: "Attendance", module: "attendance", icon: ClipboardCheck },
      { href: "/app/exams", label: "Exams & Marks", module: "exams", icon: ScrollText },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/app/fees", label: "Fees", module: "fees", icon: Receipt },
      { href: "/app/library", label: "Library", module: "library", icon: Library },
      { href: "/app/transport", label: "Transport", module: "transport", icon: Bus },
      { href: "/app/alerts", label: "Notices & Alerts", module: "notices", icon: Bell },
      { href: "/app/messages", label: "Messages", module: "messages", icon: MessageSquare },
      { href: "/app/reports", label: "Reports", module: "reports", icon: FileBarChart },
      { href: "/app/audit", label: "Audit", module: "audit", icon: Shield },
      { href: "/app/settings", label: "Settings", module: "settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, logout, online, state, firebaseNote, syncStatus, lastSyncedAt, syncError } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  const groups = useMemo(() => {
    if (!user) return [];
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href === "/app" || can(user.role, item.module, "read")),
    })).filter((group) => group.items.length);
  }, [user]);

  const unread = state.notices.filter((n) => !(n.readBy ?? []).includes(user?.id ?? "")).length;

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading college portal…</div>;
  }

  function renderNav(onClick?: () => void) {
    return (
      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.22em] text-secondary/90 uppercase">{group.title}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClick}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                    {item.href === "/app/alerts" && unread > 0 ? (
                      <Badge className="ml-auto h-5 bg-primary text-primary-foreground">{unread}</Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-6 px-1">
          <BrandMark light />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{renderNav()}</div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-black/15 px-3 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-sidebar">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-secondary/90">{roleLabel(user.role)}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" className="md:hidden" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
              <SheetHeader>
                <SheetTitle className="text-secondary">
                  <BrandMark light />
                </SheetTitle>
              </SheetHeader>
              <div className="px-2">{renderNav(() => setOpen(false))}</div>
            </SheetContent>
          </Sheet>
          <form
            className="relative min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const next = q.trim();
              router.push(next ? `/app/students?q=${encodeURIComponent(next)}` : "/app/students");
            }}
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search students, staff, courses, notices…"
              className="h-11 rounded-full border-border bg-muted/40 pl-9"
              aria-label="Search college records"
            />
          </form>
          <Badge variant="outline" className="hidden max-w-[120px] truncate sm:inline-flex" title={syncError ?? lastSyncedAt ?? syncStatus}>
            {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync failed" : online ? "Cloud idle" : "Offline"}
          </Badge>
          <Link href="/app/alerts" className="relative flex size-10 items-center justify-center rounded-full border border-border bg-card">
            <Bell className="size-4 text-primary" />
            {unread > 0 ? <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" /> : null}
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-secondary">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="hidden text-right text-xs lg:block">
              <p className="font-semibold">{user.name}</p>
              <p className="text-muted-foreground">{roleLabel(user.role)}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="min-h-10 rounded-full"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="p-4 md:p-7">
          {firebaseNote ? (
            <p className="mb-4 rounded-2xl border border-border bg-muted/60 px-3 py-2 text-sm text-primary">{firebaseNote}</p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
