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
  Settings,
  Shield,
  Users,
  Building2,
  Layers,
  FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useApp } from "@/lib/app-context";
import { can, roleLabel, type ModuleKey } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

const NAV: { href: string; label: string; module: ModuleKey; icon: typeof LayoutDashboard }[] = [
  { href: "/app", label: "Overview", module: "departments", icon: LayoutDashboard },
  { href: "/app/students", label: "Students", module: "students", icon: GraduationCap },
  { href: "/app/staff", label: "Staff", module: "staff", icon: Users },
  { href: "/app/departments", label: "Departments", module: "departments", icon: Building2 },
  { href: "/app/courses", label: "Courses", module: "courses", icon: BookOpen },
  { href: "/app/sections", label: "Sections", module: "sections", icon: Layers },
  { href: "/app/timetable", label: "Timetable", module: "timetable", icon: CalendarDays },
  { href: "/app/attendance", label: "Attendance", module: "attendance", icon: ClipboardCheck },
  { href: "/app/exams", label: "Examinations", module: "exams", icon: ScrollText },
  { href: "/app/fees", label: "Fees", module: "fees", icon: Receipt },
  { href: "/app/alerts", label: "Alerts", module: "notices", icon: Bell },
  { href: "/app/messages", label: "Notices", module: "messages", icon: MessageSquare },
  { href: "/app/reports", label: "Reports", module: "reports", icon: FileBarChart },
  { href: "/app/transport", label: "Transport", module: "transport", icon: Bus },
  { href: "/app/library", label: "Library", module: "library", icon: Library },
  { href: "/app/audit", label: "Audit", module: "audit", icon: Shield },
  { href: "/app/settings", label: "Settings", module: "settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, user, logout, online, state, firebaseNote } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  const items = useMemo(() => {
    if (!user) return [];
    return NAV.filter((item) => item.href === "/app" || can(user.role, item.module, "read"));
  }, [user]);

  const unread = state.notices.filter((n) => n.urgent).length;

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading college portal…</div>;
  }

  function renderNav(onClick?: () => void) {
    return (
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium ${
                active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {item.href === "/app/alerts" && unread > 0 ? (
                <Badge className="ml-auto bg-primary text-primary-foreground">{unread}</Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-3 py-3 md:px-5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon-sm" className="md:hidden" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
            <SheetHeader>
              <SheetTitle className="text-secondary">GP Pharmacy College</SheetTitle>
            </SheetHeader>
            <div className="px-2">{renderNav(() => setOpen(false))}</div>
          </SheetContent>
        </Sheet>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-xs font-bold text-secondary">
          GP
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">GP Pharmacy College</p>
          <p className="truncate text-xs text-muted-foreground">Academic operations portal</p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          {online ? "Live" : "Offline"}
        </Badge>
        <div className="hidden text-right text-xs sm:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{roleLabel(user.role)}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </header>
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 overflow-y-auto bg-sidebar p-3 md:block">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.2em] text-secondary">NAVIGATION</p>
          {renderNav()}
        </aside>
        <main className="min-w-0 flex-1 p-5 md:p-8">
          {firebaseNote ? (
            <p className="mb-4 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-primary">
              {firebaseNote}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
