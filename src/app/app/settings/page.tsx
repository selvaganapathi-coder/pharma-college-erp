"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isFirebaseConfigured, firebaseProjectId } from "@/lib/firebase";
import { useApp } from "@/lib/app-context";

export default function SettingsPage() {
  const { state, firebaseNote } = useApp();
  const firebaseOn = isFirebaseConfigured();
  const projectId = firebaseProjectId();
  const pay = Boolean(process.env.NEXT_PUBLIC_PAY_READY);

  return (
    <Guard module="settings">
      <PageHeader
        title="Settings and security"
        note="Firebase is connected for this college. MSG91 WhatsApp and SMS can wait. Live fee keys are still optional."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {firebaseOn ? `Connected · ${projectId}` : "Off"}</p>
            {firebaseNote ? <p>{firebaseNote}</p> : null}
            <p>
              In the Firebase console, turn on Authentication → Email/Password, and create a Firestore database.
              Paste the rules from firestore.rules so college data can sync.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">MSG91 WhatsApp and SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: Waiting. We will add this later.</p>
            <p>Alerts still save in the app and as email/SMS queue notes until MSG91 keys are set.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">Payment gateway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {pay ? "Live keys present" : "GP Pay demo checkout"}</p>
            <p>Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take real fees. Card numbers are never stored.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">Access control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{state.users.filter((u) => u.active).length} active logins.</p>
            <p>Admin sees all. Staff teach and mark. Students and parents see only linked records.</p>
          </CardContent>
        </Card>
      </div>
      <Alert className="mt-4 border-[#F0C94A] bg-[#FFF8EA]">
        <AlertTitle>Student data care</AlertTitle>
        <AlertDescription>
          Do not export student files to personal mail. Use this portal. Audit logs record who opened and changed
          records. Offline copies stay in the browser until Firebase sync is on.
        </AlertDescription>
      </Alert>
    </Guard>
  );
}
