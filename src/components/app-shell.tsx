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
  { href: "/app", label: "Home", module: "departments", icon: LayoutDashboard },
  { href: "/app/students", label: "Students", module: "students", icon: GraduationCap },
  { href: "/app/staff", label: "Staff", module: "staff", icon: Users },
  { href: "/app/departments", label: "Departments", module: "departments", icon: Building2 },
  { href: "/app/courses", label: "Courses", module: "courses", icon: BookOpen },
  { href: "/app/sections", label: "Sections", module: "sections", icon: Layers },
  { href: "/app/timetable", label: "Timetable", module: "timetable", icon: CalendarDays },
  { href: "/app/attendance", label: "Attendance", module: "attendance", icon: ClipboardCheck },
  { href: "/app/exams", label: "Exam marks", module: "exams", icon: ScrollText },
  { href: "/app/fees", label: "Fees", module: "fees", icon: Receipt },
  { href: "/app/alerts", label: "Alerts", module: "notices", icon: Bell },
  { href: "/app/messages", label: "Messages", module: "messages", icon: MessageSquare },
  { href: "/app/reports", label: "Reports", module: "reports", icon: FileBarChart },
  { href: "/app/transport", label: "Transport", module: "transport", icon: Bus },
  { href: "/app/library", label: "Library", module: "library", icon: Library },
  { href: "/app/audit", label: "Audit logs", module: "audit", icon: Shield },
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
    return NAV.filter((item) => {
      if (item.href === "/app") return true;
      return can(user.role, item.module, "read");
    });
  }, [user]);

  const unread = state.notices.filter((n) => n.urgent).length;

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gp-cream)] text-[#7A1F1F]">
        Loading your college portal…
      </div>
    );
  }

  function renderNav(onClick?: () => void) {
    return (
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-[#C41E3A] text-white" : "text-[#4A1C1C] hover:bg-[#FFF3C4]"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {item.href === "/app/alerts" && unread > 0 ? (
                <Badge className="ml-auto bg-[#EAB308] text-[#4A1C1C]">{unread}</Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8EA]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#F0C94A] bg-[#C41E3A] px-3 py-3 text-white md:px-5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="secondary" size="icon-sm" className="md:hidden bg-[#EAB308] text-[#4A1C1C]" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#FFF8EA]">
            <SheetHeader>
              <SheetTitle>GP Pharmacy College</SheetTitle>
            </SheetHeader>
            <div className="px-2">
              {renderNav(() => setOpen(false))}
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">GP Pharmacy College</p>
          <p className="truncate text-xs text-white/85">College ERP · easy records and alerts</p>
        </div>
        <Badge className={online ? "bg-[#EAB308] text-[#4A1C1C]" : "bg-white/20 text-white"}>
          {online ? "Online" : "Offline mode"}
        </Badge>
        <Badge className="hidden bg-white/15 text-white sm:inline-flex">Firebase</Badge>
        <div className="hidden text-right text-xs sm:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-white/80">{roleLabel(user.role)}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="bg-[#EAB308] text-[#4A1C1C] hover:bg-[#F5D76E]"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-56 shrink-0 overflow-y-auto border-r border-[#F0C94A] bg-white p-3 md:block">
          {renderNav()}
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {firebaseNote ? (
            <p className="mb-4 rounded-lg border border-[#F0C94A] bg-[#FFF3C4] px-3 py-2 text-sm text-[#4A1C1C]">
              {firebaseNote}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
