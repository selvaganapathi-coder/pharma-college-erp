import type { Role } from "./types";

export type PortalId = "admin" | "staff" | "student" | "parent";
export type LoginPortal = "office" | "student" | "parent";

export function portalForRole(role: Role): PortalId {
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  if (role === "student") return "student";
  return "parent";
}

export function portalHome(role: Role) {
  const portal = portalForRole(role);
  if (portal === "admin") return "/app";
  return `/${portal}`;
}

export function portalLabel(portal: PortalId) {
  if (portal === "admin") return "Admin Portal";
  if (portal === "staff") return "Staff Portal";
  if (portal === "student") return "Student Portal";
  return "Parent Portal";
}

export function loginPortalMatchesRole(selected: LoginPortal, role: Role) {
  if (selected === "office") return role === "admin" || role === "staff";
  return selected === role;
}

export function rolesForPortal(portal: PortalId): Role[] {
  return [portal];
}

export function pathPortal(pathname: string): PortalId | null {
  if (pathname === "/app" || pathname.startsWith("/app/")) return "admin";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "staff";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "student";
  if (pathname === "/parent" || pathname.startsWith("/parent/")) return "parent";
  return null;
}

export function accessDeniedMessage(actual: Role) {
  return `Access denied\nThis account belongs to the ${portalLabel(portalForRole(actual))}.`;
}
