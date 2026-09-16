# GP Pharmacy College ERP

College operations portal for **GP Pharmacy College**. Firebase Authentication is the source of truth for passwords. There is no demo login and no fake payment success.

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

1. Sign in if an admin already exists.
2. Create the first admin only when Firebase `meta/setup` does not exist.
3. Publish `firestore.rules` and `storage.rules` from this repo.

### Students

Admit from **Students → Add student**. Department, course, batch, and section are linked dropdowns that show names, not document ids. Batch options come from section intake labels (for example `2026–2030`), not raw document ids.

Staff records include employment and professional fields, a profile page, and subject assignments from the department subject list. Timetable entries can be edited with start/end times and reject overlapping staff, room, or section bookings.

Tick **Create student login** to provision a Firebase Authentication user. The password is sent only to Firebase Auth (via the server Identity Toolkit API) and is never written to the student Firestore document. The college profile is `users/{uid}` with `role = student` and `studentId` pointing at the student record.

Student sessions load only that student's document and related fees, attendance, marks, and library checkouts. Changing a URL to another student id is blocked.

### Firebase (pharmacy-98684)

1. Authentication → enable Email/Password
2. Authorized domains: `localhost` and your live host
3. Firestore + Storage
4. Publish the rules files in this repository

### Server keys (optional, required for live money/SMS)

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Create and verify Razorpay orders |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Mark a fee **paid** in Firestore after signature verification |
| `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` | SMS / WhatsApp to a student phone on file |
| `SMTP_HOST` | Email (not implemented as a send transport yet; the API reports not configured honestly) |

Without Razorpay keys, Pay shows a configuration error. The app never stores card numbers and never marks a fee paid because a browser request succeeded.
