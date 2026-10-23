# GP Pharmacy College

**College Management System** for GP Pharmacy College. *Learn • Practice • Lead*

Firebase Authentication is the source of truth for passwords. There is no demo login and no fake payment success.

This app has four portals:

| Role | Portal |
| --- | --- |
| Admin | `/app` |
| Staff | `/staff` |
| Student | `/student` |
| Parent | `/parent` |

After sign-in, routing follows `users/{uid}.role`. The login tabs only describe the portal; they are not authorization.

The UI is a single Next.js app with a mobile-first layout: drawer navigation below the `lg` breakpoint, role-specific bottom navigation, record cards instead of wide tables on phones, and a day selector for timetables.

Application repo: [github.com/selvaganapathi-coder/pharma-college-erp](https://github.com/selvaganapathi-coder/pharma-college-erp)

## Run

```bash
git clone https://github.com/selvaganapathi-coder/pharma-college-erp.git
cd pharma-college-erp
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:43123

```bash
npm run lint
npm run test
npm run build
```

### First administrator

1. Sign in on `/` if an administrator already exists. The login page has no public registration.
2. `/setup` stays closed unless the server, using `FIREBASE_SERVICE_ACCOUNT_JSON`, confirms that no administrator and no `meta/setup` document exist. The browser cannot create that lock itself.
3. Publish `firestore.rules` and `storage.rules` from this repo. See **Publish Firebase rules** below.

### Students

Admit from **Students → Add student**. Department, course, batch, and section are linked dropdowns that show names, not document ids. Batch options come from section intake labels (for example `2026–2030`), not raw document ids.

Staff records include employment and professional fields, a profile page, and subject assignments from the department subject list. Timetable entries can be edited with start/end times and reject overlapping staff, room, or section bookings.

Tick **Create student login** to provision a Firebase Authentication user. The password is sent only to Firebase Auth (via the server Identity Toolkit API) and is never written to the student Firestore document. The college profile is `users/{uid}` with `role = student` and `studentId` pointing at the student record.

Student sessions load only that student's document plus related fees, attendance, marks, timetable for their section, and library checkouts. Parent sessions load only the linked child (`childStudentId`, with optional `studentIds[]`). Staff sessions load timetable rows where `staffId` matches, then students in those sections. Changing `childStudentId` on the client cannot expand Firestore access; identity fields on `users/{uid}` are locked for self-updates.

Publish `firestore.rules` from this repository so the new portal isolation is enforced in the cloud.

### Firebase (pharmacy-98684)

1. Authentication → enable Email/Password
2. Authorized domains: `localhost` and `pharma-college-erp.vercel.app`
3. Firestore + Storage
4. Publish the rules files in this repository

### Server keys

Copy `.env.example` to `.env.local` for local work. On Vercel, set the same names in Project → Settings → Environment Variables, then redeploy. `NEXT_PUBLIC_*` values are baked in at build time.

Firebase web config already has a public fallback for project `pharmacy-98684`. Set the `NEXT_PUBLIC_FIREBASE_*` variables when you want the build to use a different Firebase project.

This app does not use `DATABASE_URL`, `NEXTAUTH_URL`, or a Google OAuth client. Sign-in is Firebase email and password.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Site origin for links, e.g. `https://pharma-college-erp.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes for setup lock, fee ledger, Resend password reset | One-line Firebase service account JSON |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Optional | Email. Both must be set or email is skipped |
| `MSG91_AUTH_KEY` | Optional | Shared MSG91 auth key for SMS and WhatsApp |
| `MSG91_SENDER_ID` / `MSG91_SMS_TEMPLATE_ID` | Optional, both required to send SMS | DLT-approved sender and flow template. `MSG91_SENDER` and `MSG91_TEMPLATE_ID` are fallbacks |
| `MSG91_WHATSAPP_INTEGRATED_NUMBER` / `MSG91_WHATSAPP_TEMPLATE_NAME` | Optional, both required to send WhatsApp | Approved WhatsApp template. `MSG91_WHATSAPP_NAMESPACE` and `MSG91_WHATSAPP_LANGUAGE` are optional |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional | Fee checkout. Without them Pay explains that it is not configured |

SMS in India must use a DLT-registered template. The template should expose two variables, `VAR1` (title, 30 characters) and `VAR2` (message, 60 characters). WhatsApp sends only an approved template (`body_1` title, `body_2` message) from `MSG91_WHATSAPP_INTEGRATED_NUMBER`. If a key is missing, the server logs a warning and continues. Alerts, fee reminders, and new student or parent logins use this layer.

### Vercel

Framework preset: Next.js. Root directory: repository root. Build command: `npm run build`. Install command: `npm install`. Node.js 20 or newer. No `vercel.json` redirect or output override is required; `vercel.json` only pins the Next.js framework.

Production URL to allow in Firebase Authentication → Settings → Authorized domains: `pharma-college-erp.vercel.app` and `localhost`.

### Publish Firebase rules

The live project must be updated after this change. Client apps cannot create `meta/setup` or another administrator. `GET /api/setup` writes that lock when the service account can see an existing admin.

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project pharmacy-98684
```

Sign in to Firebase with an account that can deploy `pharmacy-98684` first (`npx firebase-tools login`). Indexes in `firestore.indexes.json` are unchanged; the command publishes them with the rules.

### First administrator

`/setup` asks the server whether an administrator already exists. Without `FIREBASE_SERVICE_ACCOUNT_JSON` the form stays closed. With the key, the server creates the Auth user, `users/{uid}`, and `meta/setup` only when both are absent.
