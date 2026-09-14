"use client";

import { PageHeader } from "@/components/page-header";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useApp } from "@/lib/app-context";

export default function SettingsPage() {
  const { state } = useApp();
  const firebaseOn = isFirebaseConfigured();
  const msg91 = Boolean(process.env.NEXT_PUBLIC_MSG91_READY);
  const pay = Boolean(process.env.NEXT_PUBLIC_PAY_READY);

  return (
    <Guard module="settings">
      <PageHeader
        title="Settings and security"
        note="Connect Firebase, MSG91, and a live payment key when you are ready. Until then the college portal works offline on this device."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">Firebase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {firebaseOn ? "Connected" : "Demo mode (IndexedDB on this browser)"}</p>
            <p>
              Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID to sync the college database to
              Cloud Firestore. Security rules ship in firestore.rules.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-[#8B1528]">MSG91 WhatsApp and SMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {msg91 ? "Ready" : "Demo queue (no live send)"}</p>
            <p>Set MSG91_AUTH_KEY and MSG91_SENDER on the server. Email uses EMAIL_FROM if you add SMTP later.</p>
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
