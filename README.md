# GP Pharmacy College ERP

College operations portal for **GP Pharmacy College**. Crimson and gold on cream. The system starts empty — you enter live department, staff, and student records. There is no shared demo login.

Application repo: [github.com/selvaganapathi-coder/pharma-college-erp](https://github.com/selvaganapathi-coder/pharma-college-erp)

## What you can do

- Full add / view / edit / delete for students, staff, departments, courses, sections, timetable, exams, fees, books, and bus routes
- Photo upload (student, staff, department, book cover, bus)
- Linked lists: department → course → section → staff
- Timetable editor, attendance, exam lock, fee plans, pay, print receipt
- Library issue/return with overdue fine
- Alerts on WhatsApp, SMS, email, in-app (MSG91/SMTP keys for live send)
- Reports + CSV, audit log
- Offline copy on this device + Firebase when signed in

## Run

```bash
git clone https://github.com/selvaganapathi-coder/pharma-college-erp.git
cd pharma-college-erp
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:43123

### First login

1. Open **Sign in** if you already created an admin. Use **Create the admin account** only once.
2. After that, the same email works on any browser once Firebase Auth is on.
3. Add departments, programmes, sections, then staff and students. Optional portal passwords create staff/student/parent sign-in.

## Firebase (pharmacy-98684)

1. Authentication → enable **Email/Password**
2. Authentication → Settings → **Authorized domains** — add `localhost` and your live site (Vercel domain)
3. Create Firestore and Storage
4. Publish `firestore.rules` and `storage.rules`

If Email/Password is off, or this site is not in Authorized domains, the admin is stored only in that browser and the create-admin screen appears again on the next device or preview URL.

## Live keys (optional)

`.env.local`: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `SMTP_HOST`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

Without gateway keys, alerts are stored and queued, and fee checkout still issues a college receipt (card numbers are never stored).
