"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { searchErp } from "@/lib/search";

export function GlobalSearch() {
  const { state, user } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const hits = useMemo(() => (user ? searchErp(state, q, user.role) : []), [state, q, user]);
  const placeholder =
    user?.role === "staff" ? "Search your students, classes, notices…" : "Search students, staff, courses, notices…";

  const resultsList =
    q.trim().length < 2 ? null : (
      <ul className="absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/8">
        {hits.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted-foreground">No matching records.</li>
        ) : (
          hits.map((hit) => (
            <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setQ("");
                  setMobileOpen(false);
                  router.push(hit.href);
                }}
              >
                <span className="text-[10px] font-bold tracking-wide text-primary uppercase">{hit.kind}</span>
                <span className="break-words text-sm font-semibold">{hit.title}</span>
                <span className="break-words text-xs text-muted-foreground">{hit.subtitle}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    );

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end lg:block">
      <div className="relative hidden min-w-0 flex-1 lg:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 min-h-11 rounded-full border-border bg-[#f7f1e4] pl-9"
          aria-label="Search college records"
          aria-autocomplete="list"
        />
        {resultsList}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 lg:hidden"
        aria-label="Search"
        onClick={() => setMobileOpen(true)}
      >
        <Search className="size-4" />
      </Button>
      {mobileOpen ? (
        <div className="fixed inset-x-3 top-3 z-50 lg:hidden">
          <div className="relative rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/10">
            <div className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search students…"
                className="h-11 min-h-11 min-w-0 flex-1 border-0 bg-transparent shadow-none"
                aria-label="Search college records"
              />
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Close search" onClick={() => { setMobileOpen(false); setQ(""); }}>
                <X className="size-4" />
              </Button>
            </div>
            {q.trim().length >= 2 ? (
              <ul className="mt-2 max-h-[60dvh] overflow-auto">
                {hits.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground">No matching records.</li>
                ) : (
                  hits.map((hit) => (
                    <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setQ("");
                          setMobileOpen(false);
                          router.push(hit.href);
                        }}
                      >
                        <span className="text-[10px] font-bold tracking-wide text-primary uppercase">{hit.kind}</span>
                        <span className="break-words text-sm font-semibold">{hit.title}</span>
                        <span className="break-words text-xs text-muted-foreground">{hit.subtitle}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
