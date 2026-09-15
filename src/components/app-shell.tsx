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
    return NAV.filter((item) => item.href === "/app" || can(user.role, item.module, "read"));
  }, [user]);

  const unread = state.notices.filter((n) => n.urgent).length;

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFE566] text-[#C41E3A]">
        Loading GP Pharmacy College ERP…
      </div>
    );
  }

  function renderNav(onClick?: () => void) {
    return (
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                active ? "bg-[#C41E3A] text-[#FFE566]" : "text-[#C41E3A] hover:bg-[#FFF3A0]"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {item.href === "/app/alerts" && unread > 0 ? (
                <Badge className="ml-auto bg-[#C41E3A] text-[#FFE566]">{unread}</Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFE566] text-[#C41E3A]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-[#C41E3A] bg-[#FFD000] px-3 py-3 md:px-5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="secondary" size="icon-sm" className="md:hidden bg-[#C41E3A] text-[#FFE566]" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#FFE566] text-[#C41E3A]">
            <SheetHeader>
              <SheetTitle className="text-[#C41E3A]">GP Pharmacy College</SheetTitle>
            </SheetHeader>
            <div className="px-2">{renderNav(() => setOpen(false))}</div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-wide text-[#C41E3A]">GP Pharmacy College</p>
          <p className="truncate text-xs text-[#C41E3A]">Full ERP · records, class, fees, library</p>
        </div>
        <Badge className="bg-[#C41E3A] text-[#FFE566]">{online ? "Online" : "Offline"}</Badge>
        <div className="hidden text-right text-xs sm:block">
          <p className="font-semibold text-[#C41E3A]">{user.name}</p>
          <p>{roleLabel(user.role)}</p>
        </div>
        <Button
          size="sm"
          className="bg-[#C41E3A] text-[#FFE566]"
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
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-56 shrink-0 overflow-y-auto border-r-2 border-[#C41E3A] bg-[#FFEF8A] p-3 md:block">
          {renderNav()}
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {firebaseNote ? (
            <p className="mb-4 rounded-lg border-2 border-[#C41E3A] bg-[#FFF3A0] px-3 py-2 text-sm text-[#C41E3A]">
              {firebaseNote}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
