"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/app-context";

export default function AuditPage() {
  const { state } = useApp();
  return (
    <Guard module="audit">
      <PageHeader
        title="Audit logs"
        note="Every add, edit, delete, login, and payment is stored. Offline actions are tagged."
      />
      <DataTable
        rows={state.auditLogs}
        empty="No logs yet."
        filter={(row, q) => !q || `${row.actorName} ${row.action} ${row.entity} ${row.details}`.toLowerCase().includes(q)}
        columns={[
          { key: "at", header: "When", cell: (r) => new Date(r.at).toLocaleString() },
          { key: "who", header: "Who", cell: (r) => r.actorName },
          { key: "action", header: "Action", cell: (r) => r.action },
          { key: "entity", header: "Area", cell: (r) => `${r.entity} · ${r.entityId}` },
          { key: "details", header: "What changed", cell: (r) => r.details },
          {
            key: "net",
            header: "Network",
            cell: (r) => <Badge>{r.online ? "Online" : "Offline"}</Badge>,
          },
        ]}
      />
    </Guard>
  );
}
