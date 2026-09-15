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

1. Open the site. If no accounts exist, create the **college admin** with your office email and a password of at least 8 characters.
2. Add departments, programmes, sections, then staff and students.
3. Optional portal passwords on student/staff forms create their sign-in.

Old sample accounts (`admin@gppharmacy.edu` and similar) are stripped on load.

## Firebase (pharmacy-98684)

1. Authentication → enable Email/Password
2. Create Firestore and Storage
3. Publish `firestore.rules` and `storage.rules`

Put the web config in `.env.local`. First admin sign-in writes collections (`students`, `staff`, `departments`, …).

## Live keys (optional)

`.env.local`: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `SMTP_HOST`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

Without gateway keys, alerts are stored and queued, and fee checkout still issues a college receipt (card numbers are never stored).
