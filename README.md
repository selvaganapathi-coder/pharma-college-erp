# GP Pharmacy College ERP

College portal for **GP Pharmacy College**. Staff, students, and parents use one login page. The theme is red and yellow. Words on screen stay short and clear.

## What you can do

- Student and staff records
- Departments, courses, and sections
- Timetable and attendance
- Exam marks
- Fee payment (demo GP Pay; live Razorpay keys optional)
- Alerts on WhatsApp, SMS, email, and in-app (MSG91 optional)
- Message portal for urgent notes
- Reports with charts
- Bus transport
- Library books and checkouts
- Audit logs for admin actions
- Offline use (service worker + browser database)
- Role access: admin, staff, student, parent

## Run locally

```bash
npm install
npm run dev -- --port 43123
```

Open [http://localhost:43123](http://localhost:43123).

### Demo logins (password `college123`)

| Who | Email |
| --- | --- |
| Admin | admin@gppharmacy.edu |
| Staff | staff@gppharmacy.edu |
| Student | student@gppharmacy.edu |
| Parent | parent@gppharmacy.edu |

## Optional live services

Copy `.env.example` to `.env.local`.

- **Firebase**: Auth + Firestore sync of the college database
- **MSG91**: WhatsApp and SMS from `/api/notify`
- **Razorpay**: live fee capture from `/api/pay`

Without these keys the app still works. Data is stored in IndexedDB on the device and queued when the network is down.

## Data shape (fast reads)

Collections are keyed by `id`. Common filters use `studentId`, `sectionId`, `examId`, `date`, and `status`. Firestore composite indexes are in `firestore.indexes.json`. Rules are in `firestore.rules`.

The running app keeps a memory copy for instant screens, writes to IndexedDB, then syncs to Firestore when configured and online.

## Security

- Role checks on every page
- Students and parents only see linked records
- Card numbers are not saved
- Audit log on login, logout, and every change
- Firestore rules deny public access
