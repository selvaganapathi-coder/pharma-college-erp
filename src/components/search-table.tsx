"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SearchTable<T>({
  rows,
  columns,
  filter,
  empty,
}: {
  rows: T[];
  columns: { key: string; header: string; cell: (row: T) => ReactNode }[];
  filter: (row: T, q: string) => boolean;
  empty: string;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => rows.filter((row) => filter(row, q.trim().toLowerCase())), [rows, filter, q]);

  return (
    <div className="space-y-3">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type to search…"
        className="max-w-full bg-card sm:max-w-sm"
      />
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              {columns.map((c) => (
                <TableHead key={c.key} className="text-primary">
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="max-w-[16rem] break-words">
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 lg:hidden">
        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          shown.map((row, i) => (
            <article key={i} className="rounded-xl border border-border bg-card p-4">
              <dl className="space-y-1 text-sm">
                {columns.map((c) => (
                  <div key={c.key} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{c.header}</dt>
                    <dd className="min-w-0 text-right break-words">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
