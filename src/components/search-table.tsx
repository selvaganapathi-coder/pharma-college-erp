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
        className="max-w-sm bg-card"
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
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
                    <TableCell key={c.key}>{c.cell(row)}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
