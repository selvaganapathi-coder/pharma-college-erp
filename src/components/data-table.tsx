"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  mobileCard,
  searchPlaceholder = "Search records…",
  hideSearch,
  toolbar,
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
  mobileCard?: (row: T, actions: ReactNode) => ReactNode;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  toolbar?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const shown = useMemo(() => rows.filter((row) => filter(row, q.trim().toLowerCase())), [rows, filter, q]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const slice = shown.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="space-y-3">
      {hideSearch ? null : (
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          className="max-w-full min-h-11 rounded-full bg-card sm:max-w-sm"
          aria-label="Search records"
        />
      )}
      {toolbar}
      {shown.length === 0 ? (
        <EmptyState title={emptyTitle ?? "No records"} description={empty} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border-0 bg-card ring-1 ring-border/80 erp-shadow lg:block">
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
                      <TableCell key={c.key} className="max-w-[16rem] break-words">
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    {onOpen || canWrite ? (
                      <TableCell>
                        <RowActions
                          row={row}
                          onOpen={onOpen}
                          onEdit={onEdit}
                          onDelete={onDelete ? setPendingDelete : undefined}
                          canWrite={canWrite}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {slice.map((row) => {
              const actions = (
                <RowActions
                  row={row}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete ? setPendingDelete : undefined}
                  canWrite={canWrite}
                />
              );
              if (mobileCard) return <div key={row.id}>{mobileCard(row, actions)}</div>;
              return (
                <article key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  {mobileTitle ? <h3 className="break-words font-semibold text-primary">{mobileTitle(row)}</h3> : null}
                  <dl className="mt-2 space-y-1 text-sm">
                    {columns
                      .filter((c) => !c.hideOnMobile)
                      .map((c) => (
                        <div key={c.key} className="flex justify-between gap-3">
                          <dt className="shrink-0 text-muted-foreground">{c.header}</dt>
                          <dd className="min-w-0 text-right break-words">{c.cell(row)}</dd>
                        </div>
                      ))}
                  </dl>
                  <div className="mt-3">{actions}</div>
                </article>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {shown.length} record(s) · page {page + 1} of {pages}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" className="min-h-11 flex-1 sm:flex-none" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Archive this record?"
        message="The record will be archived and hidden from active lists. Cloud sync will apply the same change when you are online."
        confirmLabel="Archive"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete && onDelete) onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
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
