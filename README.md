# GP Pharmacy College ERP

Full college ERP for **GP Pharmacy College**. Yellow screens, red text. Students, parents, staff, and admin each get the right pages.

## What you can do

- Full **add / view / edit / delete** for students, staff, departments, courses, sections, timetable, exams, fees, books, and bus routes
- **Photo upload** (student, staff, department, book cover, bus)
- **Live lists**: department → course → section → staff
- Timetable editor, attendance, exam lock, fee plans, pay, print receipt
- Library issue/return with overdue fine
- Alerts on WhatsApp, SMS, email, in-app (MSG91/SMTP keys for live send)
- Reports + CSV, audit log
- Offline copy on this device + Firebase cloud when signed in

## Run

```bash
npm install
npm run dev
```

Open http://localhost:43123

Password for all demo users: `college123`

| Role | Email |
| --- | --- |
| Admin | admin@gppharmacy.edu |
| Staff | staff@gppharmacy.edu |
| Student | student@gppharmacy.edu |
| Parent | parent@gppharmacy.edu |

## Firebase (pharmacy-98684)

1. Authentication → enable Email/Password
2. Create Firestore and Storage
3. Publish `firestore.rules` and `storage.rules`

First admin sign-in uploads college data to separate collections (`students`, `staff`, `departments`, …).

## Live keys (optional)

`.env.local`: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `SMTP_HOST`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

The screens already send through `/api/notify` and `/api/pay`. Without keys, alerts queue and fees still issue a receipt in demo mode.
