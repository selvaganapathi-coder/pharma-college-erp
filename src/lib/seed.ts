import type { AppState } from "./types";
import { DAYS, PERIODS } from "./types";

export function makeSeed(): AppState {
  const departments = [
    { id: "d1", code: "PHC", name: "Pharmaceutics", head: "Dr. Meera Joshi", phone: "020-2441001" },
    { id: "d2", code: "PCOL", name: "Pharmacology", head: "Dr. Arun Kale", phone: "020-2441002" },
    { id: "d3", code: "PCOG", name: "Pharmacognosy", head: "Dr. Sneha Patil", phone: "020-2441003" },
    { id: "d4", code: "CHEM", name: "Pharmaceutical Chemistry", head: "Dr. Ravi Deshmukh", phone: "020-2441004" },
    { id: "d5", code: "PRAC", name: "Pharmacy Practice", head: "Dr. Kavita Shah", phone: "020-2441005" },
  ];

  const courses = [
    { id: "c1", code: "BPH", name: "B.Pharm", departmentId: "d1", years: 4, credits: 180, kind: "programme" as const },
    { id: "c2", code: "DPH", name: "D.Pharm", departmentId: "d5", years: 2, credits: 80, kind: "programme" as const },
    { id: "c3", code: "MPH", name: "M.Pharm Pharmaceutics", departmentId: "d1", years: 2, credits: 64, kind: "programme" as const },
    { id: "c4", code: "PCOL101", name: "Human Anatomy", departmentId: "d2", years: 1, credits: 4, kind: "subject" as const },
    { id: "c5", code: "CHEM101", name: "Organic Chemistry", departmentId: "d4", years: 1, credits: 4, kind: "subject" as const },
    { id: "c6", code: "PHC201", name: "Physical Pharmaceutics", departmentId: "d1", years: 2, credits: 4, kind: "subject" as const },
    { id: "c7", code: "PCOG101", name: "Pharmacognosy I", departmentId: "d3", years: 1, credits: 4, kind: "subject" as const },
    { id: "c8", code: "PRAC101", name: "Hospital Pharmacy", departmentId: "d5", years: 1, credits: 4, kind: "subject" as const },
  ];

  const sections = [
    { id: "s1", name: "B.Pharm 1-A", courseId: "c1", year: 1, room: "A-101", capacity: 60 },
    { id: "s2", name: "B.Pharm 1-B", courseId: "c1", year: 1, room: "A-102", capacity: 60 },
    { id: "s3", name: "B.Pharm 2-A", courseId: "c1", year: 2, room: "B-201", capacity: 55 },
    { id: "s4", name: "D.Pharm 1", courseId: "c2", year: 1, room: "C-12", capacity: 40 },
    { id: "s5", name: "M.Pharm 1", courseId: "c3", year: 1, room: "Lab-2", capacity: 20 },
  ];

  const staff = [
    { id: "t1", staffCode: "STF001", name: "Dr. Meera Joshi", email: "staff@gppharmacy.edu", phone: "9876500001", title: "Professor", qualification: "M.Pharm, Ph.D", departmentId: "d1", courseIds: ["c6", "c1"], joinedOn: "2018-06-12", status: "active" as const },
    { id: "t2", staffCode: "STF002", name: "Dr. Arun Kale", email: "arun.kale@gppharmacy.edu", phone: "9876500002", title: "Associate Professor", qualification: "M.Pharm, Ph.D", departmentId: "d2", courseIds: ["c4"], joinedOn: "2019-07-01", status: "active" as const },
    { id: "t3", staffCode: "STF003", name: "Dr. Sneha Patil", email: "sneha.patil@gppharmacy.edu", phone: "9876500003", title: "Assistant Professor", qualification: "M.Pharm", departmentId: "d3", courseIds: ["c7"], joinedOn: "2021-01-15", status: "active" as const },
    { id: "t4", staffCode: "STF004", name: "Prof. Nitin Rao", email: "nitin.rao@gppharmacy.edu", phone: "9876500004", title: "Lecturer", qualification: "M.Pharm", departmentId: "d4", courseIds: ["c5"], joinedOn: "2022-08-20", status: "active" as const },
    { id: "t5", staffCode: "STF005", name: "Ms. Pooja Iyer", email: "pooja.iyer@gppharmacy.edu", phone: "9876500005", title: "Librarian", qualification: "M.Lib", departmentId: "d5", courseIds: [], joinedOn: "2020-03-10", status: "active" as const },
    { id: "t6", staffCode: "STF006", name: "Dr. Kavita Shah", email: "kavita.shah@gppharmacy.edu", phone: "9876500006", title: "HOD Practice", qualification: "Pharm.D", departmentId: "d5", courseIds: ["c8", "c2"], joinedOn: "2017-11-02", status: "active" as const },
  ];

  const students = [
    { id: "st1", rollNo: "BPH2401", name: "Ananya Sharma", email: "student@gppharmacy.edu", phone: "9000000001", gender: "Female" as const, dob: "2006-04-12", bloodGroup: "B+", parentName: "Rajesh Sharma", parentPhone: "9111100001", parentEmail: "parent@gppharmacy.edu", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "12 Lake Road, Pune", admissionDate: "2024-08-01", status: "active" as const, busRouteId: "r1" },
    { id: "st2", rollNo: "BPH2402", name: "Rahul Verma", email: "rahul.verma@gppharmacy.edu", phone: "9000000002", gender: "Male" as const, dob: "2006-01-20", bloodGroup: "O+", parentName: "Suresh Verma", parentPhone: "9111100002", parentEmail: "suresh.verma@email.com", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "44 MG Road, Pune", admissionDate: "2024-08-01", status: "active" as const, busRouteId: "r1" },
    { id: "st3", rollNo: "BPH2403", name: "Fatima Khan", email: "fatima.khan@gppharmacy.edu", phone: "9000000003", gender: "Female" as const, dob: "2006-09-08", bloodGroup: "A+", parentName: "Imran Khan", parentPhone: "9111100003", parentEmail: "imran.khan@email.com", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "8 Hill View, Pune", admissionDate: "2024-08-02", status: "active" as const, busRouteId: "r2" },
    { id: "st4", rollNo: "BPH2404", name: "Karan Singh", email: "karan.singh@gppharmacy.edu", phone: "9000000004", gender: "Male" as const, dob: "2006-03-15", bloodGroup: "AB+", parentName: "Harpreet Singh", parentPhone: "9111100004", parentEmail: "harpreet.singh@email.com", departmentId: "d1", courseId: "c1", sectionId: "s2", year: 1, address: "21 Camp Area, Pune", admissionDate: "2024-08-03", status: "active" as const },
    { id: "st5", rollNo: "BPH2301", name: "Neha Kulkarni", email: "neha.kulkarni@gppharmacy.edu", phone: "9000000005", gender: "Female" as const, dob: "2005-07-11", bloodGroup: "O-", parentName: "Anita Kulkarni", parentPhone: "9111100005", parentEmail: "anita.kulkarni@email.com", departmentId: "d1", courseId: "c1", sectionId: "s3", year: 2, address: "5 FC Road, Pune", admissionDate: "2023-08-01", status: "active" as const, busRouteId: "r2" },
    { id: "st6", rollNo: "DPH2401", name: "Amit Pawar", email: "amit.pawar@gppharmacy.edu", phone: "9000000006", gender: "Male" as const, dob: "2007-02-02", bloodGroup: "B+", parentName: "Sunita Pawar", parentPhone: "9111100006", parentEmail: "sunita.pawar@email.com", departmentId: "d5", courseId: "c2", sectionId: "s4", year: 1, address: "90 Market Lane, Pune", admissionDate: "2024-08-10", status: "active" as const, busRouteId: "r1" },
    { id: "st7", rollNo: "BPH2405", name: "Priya Nair", email: "priya.nair@gppharmacy.edu", phone: "9000000007", gender: "Female" as const, dob: "2006-12-21", bloodGroup: "A-", parentName: "Ramesh Nair", parentPhone: "9111100007", parentEmail: "ramesh.nair@email.com", departmentId: "d1", courseId: "c1", sectionId: "s2", year: 1, address: "3 Baner, Pune", admissionDate: "2024-08-04", status: "active" as const },
    { id: "st8", rollNo: "BPH2302", name: "Vikram Joshi", email: "vikram.joshi@gppharmacy.edu", phone: "9000000008", gender: "Male" as const, dob: "2005-05-19", bloodGroup: "O+", parentName: "Leela Joshi", parentPhone: "9111100008", parentEmail: "leela.joshi@email.com", departmentId: "d1", courseId: "c1", sectionId: "s3", year: 2, address: "17 Kothrud, Pune", admissionDate: "2023-08-01", status: "active" as const, busRouteId: "r2" },
    { id: "st9", rollNo: "MPH2401", name: "Sana Sheikh", email: "sana.sheikh@gppharmacy.edu", phone: "9000000009", gender: "Female" as const, dob: "2001-10-30", bloodGroup: "B+", parentName: "Yusuf Sheikh", parentPhone: "9111100009", parentEmail: "yusuf.sheikh@email.com", departmentId: "d1", courseId: "c3", sectionId: "s5", year: 1, address: "11 Aundh, Pune", admissionDate: "2024-08-12", status: "active" as const },
  ];

  const users = [
    { id: "u1", email: "admin@gppharmacy.edu", password: "college123", name: "College Admin", role: "admin" as const, phone: "9800000000", active: true },
    { id: "u2", email: "staff@gppharmacy.edu", password: "college123", name: "Dr. Meera Joshi", role: "staff" as const, phone: "9876500001", staffId: "t1", active: true },
    { id: "u3", email: "student@gppharmacy.edu", password: "college123", name: "Ananya Sharma", role: "student" as const, phone: "9000000001", studentId: "st1", active: true },
    { id: "u4", email: "parent@gppharmacy.edu", password: "college123", name: "Rajesh Sharma", role: "parent" as const, phone: "9111100001", childStudentId: "st1", active: true },
  ];

  const subjects = ["c4", "c5", "c6", "c7", "c8", "c4"];
  const teachers = ["t2", "t4", "t1", "t3", "t6", "t2"];
  const timetable = DAYS.flatMap((day, di) =>
    PERIODS.map((period, pi) => ({
      id: `tt-${di}-${pi}-s1`,
      sectionId: "s1",
      day,
      period,
      courseId: subjects[pi],
      staffId: teachers[pi],
      room: pi > 3 ? "Lab-1" : "A-101",
    })),
  );

  const dates = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"];
  const attendance = students.flatMap((st, i) =>
    dates.map((date, di) => ({
      id: `att-${st.id}-${date}`,
      studentId: st.id,
      courseId: "c4",
      sectionId: st.sectionId,
      date,
      status: (i + di) % 7 === 0 ? ("absent" as const) : (i + di) % 5 === 0 ? ("late" as const) : ("present" as const),
      markedBy: "t1",
    })),
  );

  const exams = [
    { id: "e1", name: "Sessional 1 — Anatomy", courseId: "c4", sectionId: "s1", date: "2026-09-20", maxMarks: 30, locked: false },
    { id: "e2", name: "Sessional 1 — Organic Chemistry", courseId: "c5", sectionId: "s1", date: "2026-09-22", maxMarks: 30, locked: false },
    { id: "e3", name: "Mid term — Pharmaceutics", courseId: "c6", sectionId: "s3", date: "2026-10-05", maxMarks: 50, locked: false },
  ];

  const marks = students.flatMap((st, i) =>
    exams
      .filter((ex) => ex.sectionId === st.sectionId || st.year === 1)
      .map((ex, ei) => ({
        id: `m-${st.id}-${ex.id}`,
        examId: ex.id,
        studentId: st.id,
        marks: Math.min(ex.maxMarks, 16 + ((i * 3 + ei * 5) % (ex.maxMarks - 6))),
      })),
  );

  const feePlans = [
    { id: "fp1", name: "B.Pharm Term 1 2026-27", courseId: "c1", year: 1, amount: 62000, dueDate: "2026-08-15" },
    { id: "fp2", name: "D.Pharm Term 1 2026-27", courseId: "c2", year: 1, amount: 35000, dueDate: "2026-08-15" },
    { id: "fp3", name: "M.Pharm Term 1 2026-27", courseId: "c3", year: 1, amount: 85000, dueDate: "2026-08-20" },
    { id: "fp4", name: "Exam fee Sep 2026", courseId: "c1", year: 1, amount: 2500, dueDate: "2026-09-18" },
  ];

  const fees = students.flatMap((st, i) => {
    const plan = feePlans.find((p) => p.courseId === st.courseId && p.year === st.year) ?? feePlans[0];
    return [
      {
        id: `f-${st.id}-1`,
        studentId: st.id,
        planId: plan.id,
        term: plan.name,
        amount: plan.amount,
        dueDate: plan.dueDate,
        status: i < 6 ? ("paid" as const) : ("due" as const),
        paidAt: i < 6 ? "2026-08-02" : undefined,
        method: i < 6 ? "GP Pay" : undefined,
        txnId: i < 6 ? `GPX${1000 + i}` : undefined,
        receiptNo: i < 6 ? `REC-2026-${1001 + i}` : undefined,
      },
      {
        id: `f-${st.id}-2`,
        studentId: st.id,
        planId: "fp4",
        term: "Exam fee Sep 2026",
        amount: 2500,
        dueDate: "2026-09-18",
        status: i % 3 === 0 ? ("paid" as const) : ("due" as const),
        paidAt: i % 3 === 0 ? "2026-09-01" : undefined,
        method: i % 3 === 0 ? "GP Pay" : undefined,
        txnId: i % 3 === 0 ? `GPX${2000 + i}` : undefined,
        receiptNo: i % 3 === 0 ? `REC-2026-${2001 + i}` : undefined,
      },
    ];
  });

  return {
    users,
    departments,
    courses,
    sections,
    students,
    staff,
    timetable,
    attendance,
    exams,
    marks,
    feePlans,
    fees,
    notices: [
      {
        id: "n1",
        title: "Sessional exam dates",
        body: "Sessional 1 starts on 20 Sep. Open Exam marks to see your paper list.",
        channels: ["inapp", "email", "sms"],
        audience: "All",
        urgent: false,
        createdAt: "2026-09-10T09:00:00.000Z",
        createdBy: "u1",
        status: "sent",
        deliveryNote: "In-app saved. SMS/email wait for MSG91/SMTP keys.",
      },
      {
        id: "n2",
        title: "Bus timing change",
        body: "Route 1 will leave 10 minutes early from Monday.",
        channels: ["inapp", "whatsapp"],
        audience: "Students and parents",
        urgent: true,
        createdAt: "2026-09-12T06:30:00.000Z",
        createdBy: "u1",
        status: "queued",
        deliveryNote: "WhatsApp queued until MSG91 key is set.",
      },
    ],
    messages: [
      {
        id: "msg1",
        title: "Welcome to the college portal",
        body: "Use this portal for class, fees, library, and alerts. Keep your phone number updated.",
        urgent: false,
        fromUserId: "u1",
        audience: "All",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "msg2",
        title: "Urgent: ID card collection",
        body: "New first year students must collect ID cards from the office by Friday 4 PM.",
        urgent: true,
        fromUserId: "u2",
        audience: "Students",
        createdAt: "2026-09-11T11:00:00.000Z",
      },
    ],
    routes: [
      { id: "r1", name: "Route 1 — City", vehicleNo: "MH12-GP-4411", driver: "Sanjay More", driverPhone: "9888800001", stops: "Swargate, Camp, College", seats: 32 },
      { id: "r2", name: "Route 2 — West", vehicleNo: "MH12-GP-2290", driver: "Raju Shinde", driverPhone: "9888800002", stops: "Kothrud, Baner, College", seats: 28 },
    ],
    books: [
      { id: "b1", isbn: "978-81-203-1234-1", title: "Rang and Dale Pharmacology", author: "Humphrey Rang", copies: 8 },
      { id: "b2", isbn: "978-81-203-5678-2", title: "Remington: The Science of Pharmacy", author: "Allen Loyd", copies: 5 },
      { id: "b3", isbn: "978-81-203-9012-3", title: "Organic Chemistry", author: "Morrison & Boyd", copies: 10 },
      { id: "b4", isbn: "978-81-203-3456-4", title: "Pharmacognosy", author: "C.K. Kokate", copies: 6 },
      { id: "b5", isbn: "978-81-203-7890-5", title: "Pharmaceutics I", author: "R.M. Mehta", copies: 7 },
    ],
    checkouts: [
      { id: "ch1", bookId: "b1", studentId: "st1", issuedOn: "2026-09-02", dueOn: "2026-09-16" },
      { id: "ch2", bookId: "b3", studentId: "st2", issuedOn: "2026-08-20", dueOn: "2026-09-03", returnedOn: "2026-09-01" },
      { id: "ch3", bookId: "b5", studentId: "st5", issuedOn: "2026-09-08", dueOn: "2026-09-22" },
    ],
    auditLogs: [
      {
        id: "a0",
        at: "2026-09-01T08:00:00.000Z",
        actorId: "u1",
        actorName: "College Admin",
        action: "seed",
        entity: "system",
        entityId: "seed",
        details: "Full college ERP data loaded.",
        online: true,
      },
    ],
  };
}
