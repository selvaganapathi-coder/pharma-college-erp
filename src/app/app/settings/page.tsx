"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { SectionCard } from "@/components/stat-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { firebaseProjectId, isFirebaseConfigured } from "@/lib/firebase";
import { useApp } from "@/lib/app-context";

export default function SettingsPage() {
  const { state, firebaseNote, syncStatus, lastSyncedAt, syncError } = useApp();
  return (
    <Guard module="settings">
      <PageHeader title="Settings" note="College platform configuration. Secrets stay in environment variables — this screen reports status, it does not store keys." />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="College information">
          <p className="text-sm">GP Pharmacy College · Pharma College ERP</p>
          <p className="text-xs text-muted-foreground">Learn · Practice · Lead</p>
        </SectionCard>
        <SectionCard title="User & roles">
          <p className="text-sm">{state.users.filter((u) => u.active).length} active logins.</p>
          <p className="text-xs text-muted-foreground">Admin: full office. Staff: class work. Student/parent: own file only.</p>
        </SectionCard>
        <SectionCard title="Notifications">
          <p className="text-sm">In-app alerts always store. WhatsApp/SMS require MSG91. Email requires SMTP.</p>
        </SectionCard>
        <SectionCard title="Payment">
          <p className="text-sm">Razorpay Checkout. Ledger updates only after signature verification plus FIREBASE_SERVICE_ACCOUNT_JSON.</p>
        </SectionCard>
        <SectionCard title="Email / SMS">
          <p className="text-sm">MSG91 keys required for SMS/WhatsApp. SMTP is reported as not implemented until a transport is added.</p>
        </SectionCard>
        <SectionCard title="Security">
          <p className="text-sm">Firebase Auth holds passwords. Firestore rules in this repo must be published.</p>
        </SectionCard>
        <SectionCard title="Data & sync">
          <p className="text-sm">
            Firebase: {isFirebaseConfigured() ? firebaseProjectId() : "Off"} · Sync: {syncStatus}
            {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleString("en-IN")}` : ""}
          </p>
          {syncError ? <p className="text-sm text-destructive">{syncError}</p> : null}
          {firebaseNote ? <p className="text-sm">{firebaseNote}</p> : null}
        </SectionCard>
        <SectionCard title="Academic settings">
          <p className="text-sm">Programmes, sections, and batches are managed in Academic modules. No separate calendar year master exists yet.</p>
        </SectionCard>
      </div>
      <Alert className="mt-4 border border-border">
        <AlertTitle>Student data</AlertTitle>
        <AlertDescription>Photos sit in Firebase Storage when signed in. Audit logs record every save and archive.</AlertDescription>
      </Alert>
    </Guard>
  );
}
