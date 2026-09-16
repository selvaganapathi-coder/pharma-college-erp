"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-context";
import { searchErp } from "@/lib/search";

export function GlobalSearch() {
  const { state, user } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const hits = useMemo(() => (user ? searchErp(state, q, user.role) : []), [state, q, user]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={user?.role === "staff" ? "Search your students, classes, notices…" : "Search students, staff, courses, notices…"}
        className="h-11 rounded-full border-border bg-[#f7f1e4] pl-9"
        aria-label="Search college records"
        aria-autocomplete="list"
      />
      {q.trim().length >= 2 ? (
        <ul className="absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/8">
          {hits.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">No matching records.</li>
          ) : (
            hits.map((hit) => (
              <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setQ("");
                    router.push(hit.href);
                  }}
                >
                  <span className="text-[10px] font-bold tracking-wide text-primary uppercase">{hit.kind}</span>
                  <span className="text-sm font-semibold">{hit.title}</span>
                  <span className="text-xs text-muted-foreground">{hit.subtitle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
