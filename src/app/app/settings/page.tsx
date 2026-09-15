"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { firebaseProjectId, isFirebaseConfigured } from "@/lib/firebase";
import { useApp } from "@/lib/app-context";

export default function SettingsPage() {
  const { state, firebaseNote } = useApp();
  return (
    <Guard module="settings">
      <PageHeader
        title="Settings and security"
        note="Firebase, storage photos, MSG91, and fee gateway. The ERP is complete in the app; live send needs console setup."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {isFirebaseConfigured() ? `On · ${firebaseProjectId()}` : "Off"}</p>
            {firebaseNote ? <p>{firebaseNote}</p> : null}
            <p>Publish firestore.rules from this repo. Passwords are only in Firebase Auth.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MSG91 WhatsApp and SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>SMS/WhatsApp send only to a selected student phone. MSG91 keys required. SMTP is reported as not implemented until a transport is added.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment gateway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Razorpay Checkout collects money. FIREBASE_SERVICE_ACCOUNT_JSON is required to mark the fee paid after signature verification. Card numbers are never collected.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{state.users.filter((u) => u.active).length} logins. Admin all. Staff class work. Student/parent own file only.</p>
          </CardContent>
        </Card>
      </div>
      <Alert className="mt-4 border border-border">
        <AlertTitle>Student data</AlertTitle>
        <AlertDescription>Photos sit in Firebase Storage when signed in. Audit logs record every save and delete.</AlertDescription>
      </Alert>
    </Guard>
  );
}
