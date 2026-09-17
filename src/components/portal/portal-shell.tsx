"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/brand-mark";
import { GlobalSearch } from "@/components/global-search";
import { NotificationCenter } from "@/components/notification-center";
import { LoadingState } from "@/components/empty-state";
import { useApp } from "@/lib/app-context";
import { roleLabel } from "@/lib/rbac";
import { noticeVisibleTo } from "@/lib/notices";
import { accessDeniedMessage, portalHome, portalLabel, type PortalId } from "@/lib/portals";
import { COLLEGE_NAME, COLLEGE_SYSTEM } from "@/lib/brand";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

export function PortalGuard({ portal, children }: { portal: PortalId; children: ReactNode }) {
  const { ready, user } = useApp();
  const router = useRouter();
  const expected = portal === "admin" ? "admin" : portal;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const home = portalHome(user.role);
    const ok = portal === "admin" ? user.role === "admin" : user.role === expected;
    if (!ok) router.replace(home);
  }, [ready, user, router, portal, expected]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <LoadingState label={`Loading ${COLLEGE_NAME}…`} />
      </div>
    );
  }
  const ok = portal === "admin" ? user.role === "admin" : user.role === expected;
  if (!ok) {
    return (
      <div className="mx-auto max-w-lg p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-primary">Access denied</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{accessDeniedMessage(user.role)}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function PortalShell({
  portal,
  groups,
  search,
  children,
  bottomNav,
}: {
  portal: PortalId;
  groups: NavGroup[];
  search?: boolean;
  children: ReactNode;
  bottomNav?: NavItem[];
}) {
  const { user, logout, online, state, firebaseNote, syncStatus, lastSyncedAt, syncError, save } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const unreadNotices = state.notices.filter((n) => !n.archived && noticeVisibleTo(n, user, state) && !(n.readBy ?? []).includes(user.id));
  const unread = unreadNotices.length;
  const alertsHref = groups.flatMap((g) => g.items).find((i) => /notice|alert/i.test(i.label))?.href ?? portalHome(user.role);

  function renderNav(onClick?: () => void) {
    return (
      <nav className="flex flex-col gap-5" aria-label={`${portalLabel(portal)} navigation`}>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.22em] text-secondary/90 uppercase">{group.title}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== portalHome(user!.role) && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClick}
                    className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 break-words">{item.label}</span>
                    {/notice|alert/i.test(item.label) && unread > 0 ? (
                      <span className="ml-auto rounded-full bg-white px-1.5 text-[10px] font-bold text-primary">{unread}</span>
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

  const dense = portal === "admin";

  function signOut() {
    logout();
    router.replace("/");
  }

  return (
    <div className={`min-h-dvh min-w-0 bg-background ${dense ? "lg:grid lg:grid-cols-[248px_minmax(0,1fr)]" : "lg:grid lg:grid-cols-[228px_minmax(0,1fr)]"}`}>
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
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
            <p className="truncate text-[11px] text-secondary/90">{portalLabel(portal)}</p>
          </div>
        </div>
      </aside>
      <div className={`min-w-0 ${bottomNav ? "pb-20 lg:pb-0" : ""}`}>
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/70 bg-white/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" className="size-11 shrink-0 lg:hidden" aria-label="Open menu" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] bg-sidebar p-0 text-sidebar-foreground" showCloseButton={false}>
              <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
                <SheetTitle className="text-secondary">
                  <BrandMark light />
                </SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </Button>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4">{renderNav(() => setOpen(false))}</div>
              <div className="border-t border-white/10 p-3">
                <Button
                  variant="outline"
                  className="min-h-11 w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={signOut}
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {search ? (
              <>
                <p className="truncate text-sm font-bold text-primary lg:hidden">GP</p>
                <GlobalSearch />
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-primary">{COLLEGE_NAME}</p>
                <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{COLLEGE_SYSTEM}</p>
              </div>
            )}
          </div>
          <span className="hidden max-w-[110px] truncate text-[11px] text-muted-foreground xl:inline" title={syncError ?? lastSyncedAt ?? syncStatus}>
            {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync failed" : online ? "Online" : "Offline"}
          </span>
          <NotificationCenter
            notices={unreadNotices.slice(0, 8)}
            unread={unread}
            onOpenAll={() => router.push(alertsHref)}
            onRead={async (notice) => {
              if (user.role === "admin" || user.role === "staff") {
                await save("notices", { ...notice, readBy: [...new Set([...(notice.readBy ?? []), user.id])] }, `Read alert ${notice.title}.`);
              }
            }}
          />
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-secondary" aria-hidden>
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="hidden text-right text-xs lg:block">
            <p className="font-semibold">{user.name.split(" ")[0]}</p>
            <p className="text-muted-foreground">{roleLabel(user.role)}</p>
          </div>
          <Button size="icon" variant="outline" className="hidden size-11 lg:inline-flex" onClick={signOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="p-3 sm:p-4 md:p-6 lg:p-7">
          {firebaseNote ? (
            <p className="mb-4 break-words rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">{firebaseNote}</p>
          ) : null}
          {children}
        </main>
      </div>
      {bottomNav ? (
        <nav className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t border-border bg-white/95 px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Primary">
          {bottomNav.map((item) => {
            const home = portalHome(user.role);
            const active = pathname === item.href || (item.href !== home && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
