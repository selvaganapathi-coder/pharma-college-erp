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

## Firebase (project pharmacy-98684)

The portal is wired to this Firebase project. First time in the [Firebase console](https://console.firebase.google.com/project/pharmacy-98684):

1. Authentication → Sign-in method → enable **Email/Password**.
2. Firestore Database → create the database (start in production).
3. Firestore → Rules → paste `firestore.rules` from this repo and publish.

Sign-in still uses the college demo emails. The first successful Firebase login creates that Auth user and uploads college data to `erp/state`.

MSG91 WhatsApp/SMS is not connected yet.

## Optional later

- **MSG91**: WhatsApp and SMS from `/api/notify`
- **Razorpay**: live fee capture from `/api/pay`

## Data shape (fast reads)

Collections are keyed by `id`. Common filters use `studentId`, `sectionId`, `examId`, `date`, and `status`. Firestore composite indexes are in `firestore.indexes.json`. Rules are in `firestore.rules`.

The running app keeps a memory copy for instant screens, writes to IndexedDB, then syncs to Firestore when configured and online.

## Security

- Role checks on every page
- Students and parents only see linked records
- Card numbers are not saved
- Audit log on login, logout, and every change
- Firestore rules deny public access
