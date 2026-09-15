"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

const PAGE = 25;

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  filter,
  empty,
  emptyTitle,
  onEdit,
  onDelete,
  onOpen,
  canWrite,
  mobileTitle,
}: {
  rows: T[];
  columns: { key: string; header: string; cell: (row: T) => ReactNode; hideOnMobile?: boolean }[];
  filter: (row: T, q: string) => boolean;
  empty: string;
  emptyTitle?: string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onOpen?: (row: T) => void;
  canWrite?: boolean;
  mobileTitle?: (row: T) => string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const shown = useMemo(() => rows.filter((row) => filter(row, q.trim().toLowerCase())), [rows, filter, q]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const slice = shown.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="space-y-3">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(0);
        }}
        placeholder="Search records…"
        className="max-w-sm min-h-11 bg-card"
        aria-label="Search records"
      />
      {shown.length === 0 ? (
        <EmptyState title={emptyTitle ?? "No records"} description={empty} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
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
                {slice.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>{c.cell(row)}</TableCell>
                    ))}
                    {onOpen || canWrite ? (
                      <TableCell>
                        <RowActions row={row} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} canWrite={canWrite} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {slice.map((row) => (
              <article key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                {mobileTitle ? <h3 className="font-semibold text-primary">{mobileTitle(row)}</h3> : null}
                <dl className="mt-2 space-y-1 text-sm">
                  {columns
                    .filter((c) => !c.hideOnMobile)
                    .map((c) => (
                      <div key={c.key} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{c.header}</dt>
                        <dd className="text-right">{c.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
                <div className="mt-3">
                  <RowActions row={row} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} canWrite={canWrite} />
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>
              {shown.length} record(s) · page {page + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="min-h-11" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" className="min-h-11" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RowActions<T>({
  row,
  onOpen,
  onEdit,
  onDelete,
  canWrite,
}: {
  row: T;
  onOpen?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  canWrite?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onOpen ? (
        <Button size="sm" variant="outline" className="min-h-11" onClick={() => onOpen(row)}>
          View
        </Button>
      ) : null}
      {canWrite && onEdit ? (
        <Button size="sm" className="min-h-11" onClick={() => onEdit(row)}>
          Edit
        </Button>
      ) : null}
      {canWrite && onDelete ? (
        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => onDelete(row)}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
