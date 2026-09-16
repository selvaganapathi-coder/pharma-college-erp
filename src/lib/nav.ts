import {
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  Layers,
  MessageSquare,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  Users,
  Building2,
  FileBarChart,
  CalendarRange,
  NotebookPen,
  UserRound,
  Presentation,
} from "lucide-react";
import type { NavGroup, NavItem } from "@/components/portal/portal-shell";

export const ADMIN_NAV: NavGroup[] = [
  { title: "Main", items: [{ href: "/app", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Academic",
    items: [
      { href: "/app/students", label: "Students", icon: GraduationCap },
      { href: "/app/staff", label: "Staff", icon: Users },
      { href: "/app/departments", label: "Departments", icon: Building2 },
      { href: "/app/courses", label: "Courses", icon: BookOpen },
      { href: "/app/subjects", label: "Subjects", icon: NotebookPen },
      { href: "/app/batches", label: "Batches", icon: CalendarRange },
      { href: "/app/sections", label: "Sections", icon: Layers },
      { href: "/app/timetable", label: "Timetable", icon: CalendarDays },
      { href: "/app/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/app/exams", label: "Exams & Marks", icon: ScrollText },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/app/fees", label: "Fees", icon: Receipt },
      { href: "/app/library", label: "Library", icon: Library },
      { href: "/app/transport", label: "Transport", icon: Bus },
      { href: "/app/alerts", label: "Notices & Alerts", icon: Bell },
      { href: "/app/messages", label: "Messages", icon: MessageSquare },
      { href: "/app/reports", label: "Reports", icon: FileBarChart },
      { href: "/app/audit", label: "Audit", icon: Shield },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const STAFF_NAV: NavGroup[] = [
  { title: "Dashboard", items: [{ href: "/staff", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "My Teaching",
    items: [
      { href: "/staff/classes", label: "My Classes", icon: Presentation },
      { href: "/staff/timetable", label: "My Timetable", icon: CalendarDays },
      { href: "/staff/students", label: "Students", icon: GraduationCap },
      { href: "/staff/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/staff/exams", label: "Exams & Marks", icon: ScrollText },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/staff/notices", label: "Notices", icon: Bell },
      { href: "/staff/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    title: "My Account",
    items: [
      { href: "/staff/profile", label: "Profile", icon: UserRound },
      { href: "/staff/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const STUDENT_NAV: NavGroup[] = [
  {
    title: "My college",
    items: [
      { href: "/student", label: "Dashboard", icon: LayoutDashboard },
      { href: "/student/profile", label: "My Profile", icon: UserRound },
      { href: "/student/timetable", label: "My Timetable", icon: CalendarDays },
      { href: "/student/attendance", label: "My Attendance", icon: ClipboardCheck },
      { href: "/student/exams", label: "My Exams & Marks", icon: ScrollText },
      { href: "/student/fees", label: "My Fees", icon: Receipt },
      { href: "/student/library", label: "Library", icon: Library },
      { href: "/student/notices", label: "Notices", icon: Bell },
      { href: "/student/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];

export const PARENT_NAV: NavGroup[] = [
  {
    title: "Your child",
    items: [
      { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
      { href: "/parent/profile", label: "Child Profile", icon: UserRound },
      { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/parent/exams", label: "Exams & Results", icon: ScrollText },
      { href: "/parent/fees", label: "Fees", icon: Receipt },
      { href: "/parent/timetable", label: "Timetable", icon: CalendarDays },
      { href: "/parent/library", label: "Library", icon: Library },
      { href: "/parent/notices", label: "Notices", icon: Bell },
      { href: "/parent/messages", label: "Messages", icon: MessageSquare },
    ],
  },
];

export const STUDENT_BOTTOM: NavItem[] = [
  { href: "/student", label: "Home", icon: LayoutDashboard },
  { href: "/student/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/student/exams", label: "Results", icon: ScrollText },
  { href: "/student/profile", label: "Profile", icon: UserRound },
];

export const PARENT_BOTTOM: NavItem[] = [
  { href: "/parent", label: "Home", icon: LayoutDashboard },
  { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/parent/exams", label: "Results", icon: ScrollText },
  { href: "/parent/fees", label: "Fees", icon: Receipt },
  { href: "/parent/notices", label: "More", icon: Bell },
];

export const STAFF_BOTTOM: NavItem[] = [
  { href: "/staff", label: "Home", icon: LayoutDashboard },
  { href: "/staff/classes", label: "Classes", icon: Presentation },
  { href: "/staff/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/staff/exams", label: "Marks", icon: ScrollText },
  { href: "/staff/timetable", label: "More", icon: CalendarDays },
];
