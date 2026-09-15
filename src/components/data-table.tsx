"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  filter,
  empty,
  onEdit,
  onDelete,
  onOpen,
  canWrite,
}: {
  rows: T[];
  columns: { key: string; header: string; cell: (row: T) => ReactNode }[];
  filter: (row: T, q: string) => boolean;
  empty: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onOpen?: (row: T) => void;
  canWrite?: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => rows.filter((row) => filter(row, q.trim().toLowerCase())), [rows, filter, q]);

  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search records…" className="max-w-sm bg-card" />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70">
              {columns.map((c) => (
                <TableHead key={c.key} className="font-semibold text-primary">
                  {c.header}
                </TableHead>
              ))}
              {onOpen || canWrite ? <TableHead className="text-primary">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="py-12 text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.cell(row)}</TableCell>
                  ))}
                  {onOpen || canWrite ? (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {onOpen ? (
                          <Button size="sm" variant="outline" onClick={() => onOpen(row)}>
                            View
                          </Button>
                        ) : null}
                        {canWrite && onEdit ? (
                          <Button size="sm" onClick={() => onEdit(row)}>
                            Edit
                          </Button>
                        ) : null}
                        {canWrite && onDelete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Delete this record?")) onDelete(row);
                            }}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{shown.length} record(s)</p>
    </div>
  );
}
