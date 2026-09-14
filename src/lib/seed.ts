import type { AppState, Role } from "./types";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const periods = ["9:00 AM", "10:00 AM", "11:15 AM", "12:15 PM"];

export function makeSeed(): AppState {
  const departments = [
    { id: "d1", code: "PHC", name: "Pharmaceutics", head: "Dr. Meera Joshi" },
    { id: "d2", code: "PCOL", name: "Pharmacology", head: "Dr. Arun Kale" },
    { id: "d3", code: "PCOG", name: "Pharmacognosy", head: "Dr. Sneha Patil" },
    { id: "d4", code: "CHEM", name: "Pharmaceutical Chemistry", head: "Dr. Ravi Deshmukh" },
    { id: "d5", code: "PRAC", name: "Pharmacy Practice", head: "Dr. Kavita Shah" },
  ];

  const courses = [
    { id: "c1", code: "BPH", name: "B.Pharm", departmentId: "d1", years: 4, credits: 180 },
    { id: "c2", code: "DPH", name: "D.Pharm", departmentId: "d5", years: 2, credits: 80 },
    { id: "c3", code: "MPH", name: "M.Pharm Pharmaceutics", departmentId: "d1", years: 2, credits: 64 },
    { id: "c4", code: "PCOL101", name: "Human Anatomy", departmentId: "d2", years: 1, credits: 4 },
    { id: "c5", code: "CHEM101", name: "Organic Chemistry", departmentId: "d4", years: 1, credits: 4 },
    { id: "c6", code: "PHC201", name: "Physical Pharmaceutics", departmentId: "d1", years: 2, credits: 4 },
  ];

  const sections = [
    { id: "s1", name: "B.Pharm 1-A", courseId: "c1", year: 1, room: "A-101" },
    { id: "s2", name: "B.Pharm 1-B", courseId: "c1", year: 1, room: "A-102" },
    { id: "s3", name: "B.Pharm 2-A", courseId: "c1", year: 2, room: "B-201" },
    { id: "s4", name: "D.Pharm 1", courseId: "c2", year: 1, room: "C-12" },
  ];

  const staff = [
    { id: "t1", staffCode: "STF001", name: "Dr. Meera Joshi", email: "staff@gppharmacy.edu", phone: "9876500001", title: "Professor", departmentId: "d1", joinedOn: "2018-06-12", status: "active" as const },
    { id: "t2", staffCode: "STF002", name: "Dr. Arun Kale", email: "arun.kale@gppharmacy.edu", phone: "9876500002", title: "Associate Professor", departmentId: "d2", joinedOn: "2019-07-01", status: "active" as const },
    { id: "t3", staffCode: "STF003", name: "Dr. Sneha Patil", email: "sneha.patil@gppharmacy.edu", phone: "9876500003", title: "Assistant Professor", departmentId: "d3", joinedOn: "2021-01-15", status: "active" as const },
    { id: "t4", staffCode: "STF004", name: "Prof. Nitin Rao", email: "nitin.rao@gppharmacy.edu", phone: "9876500004", title: "Lecturer", departmentId: "d4", joinedOn: "2022-08-20", status: "active" as const },
    { id: "t5", staffCode: "STF005", name: "Ms. Pooja Iyer", email: "pooja.iyer@gppharmacy.edu", phone: "9876500005", title: "Librarian", departmentId: "d5", joinedOn: "2020-03-10", status: "active" as const },
  ];

  const students = [
    { id: "st1", rollNo: "BPH2401", name: "Ananya Sharma", email: "student@gppharmacy.edu", phone: "9000000001", gender: "Female" as const, parentName: "Rajesh Sharma", parentPhone: "9111100001", parentEmail: "parent@gppharmacy.edu", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "12 Lake Road, Pune", status: "active" as const, busRouteId: "r1" },
    { id: "st2", rollNo: "BPH2402", name: "Rahul Verma", email: "rahul.verma@gppharmacy.edu", phone: "9000000002", gender: "Male" as const, parentName: "Suresh Verma", parentPhone: "9111100002", parentEmail: "suresh.verma@email.com", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "44 MG Road, Pune", status: "active" as const, busRouteId: "r1" },
    { id: "st3", rollNo: "BPH2403", name: "Fatima Khan", email: "fatima.khan@gppharmacy.edu", phone: "9000000003", gender: "Female" as const, parentName: "Imran Khan", parentPhone: "9111100003", parentEmail: "imran.khan@email.com", departmentId: "d1", courseId: "c1", sectionId: "s1", year: 1, address: "8 Hill View, Pune", status: "active" as const, busRouteId: "r2" },
    { id: "st4", rollNo: "BPH2404", name: "Karan Singh", email: "karan.singh@gppharmacy.edu", phone: "9000000004", gender: "Male" as const, parentName: "Harpreet Singh", parentPhone: "9111100004", parentEmail: "harpreet.singh@email.com", departmentId: "d1", courseId: "c1", sectionId: "s2", year: 1, address: "21 Camp Area, Pune", status: "active" as const },
    { id: "st5", rollNo: "BPH2301", name: "Neha Kulkarni", email: "neha.kulkarni@gppharmacy.edu", phone: "9000000005", gender: "Female" as const, parentName: "Anita Kulkarni", parentPhone: "9111100005", parentEmail: "anita.kulkarni@email.com", departmentId: "d1", courseId: "c1", sectionId: "s3", year: 2, address: "5 FC Road, Pune", status: "active" as const, busRouteId: "r2" },
    { id: "st6", rollNo: "DPH2401", name: "Amit Pawar", email: "amit.pawar@gppharmacy.edu", phone: "9000000006", gender: "Male" as const, parentName: "Sunita Pawar", parentPhone: "9111100006", parentEmail: "sunita.pawar@email.com", departmentId: "d5", courseId: "c2", sectionId: "s4", year: 1, address: "90 Market Lane, Pune", status: "active" as const, busRouteId: "r1" },
    { id: "st7", rollNo: "BPH2405", name: "Priya Nair", email: "priya.nair@gppharmacy.edu", phone: "9000000007", gender: "Female" as const, parentName: "Ramesh Nair", parentPhone: "9111100007", parentEmail: "ramesh.nair@email.com", departmentId: "d1", courseId: "c1", sectionId: "s2", year: 1, address: "3 Baner, Pune", status: "active" as const },
    { id: "st8", rollNo: "BPH2302", name: "Vikram Joshi", email: "vikram.joshi@gppharmacy.edu", phone: "9000000008", gender: "Male" as const, parentName: "Leela Joshi", parentPhone: "9111100008", parentEmail: "leela.joshi@email.com", departmentId: "d1", courseId: "c1", sectionId: "s3", year: 2, address: "17 Kothrud, Pune", status: "active" as const, busRouteId: "r2" },
  ];

  const users = [
    { id: "u1", email: "admin@gppharmacy.edu", password: "college123", name: "College Admin", role: "admin" as const, phone: "9800000000", active: true },
    { id: "u2", email: "staff@gppharmacy.edu", password: "college123", name: "Dr. Meera Joshi", role: "staff" as const, phone: "9876500001", staffId: "t1", active: true },
    { id: "u3", email: "student@gppharmacy.edu", password: "college123", name: "Ananya Sharma", role: "student" as const, phone: "9000000001", studentId: "st1", active: true },
    { id: "u4", email: "parent@gppharmacy.edu", password: "college123", name: "Rajesh Sharma", role: "parent" as const, phone: "9111100001", childStudentId: "st1", active: true },
  ];

  const timetable = days.flatMap((day, di) =>
    periods.map((period, pi) => ({
      id: `tt-${di}-${pi}`,
      sectionId: pi % 2 === 0 ? "s1" : "s3",
      day,
      period,
      courseId: ["c4", "c5", "c6", "c1"][pi],
      staffId: ["t2", "t4", "t1", "t3"][pi],
      room: pi % 2 === 0 ? "A-101" : "B-201",
    })),
  );

  const dates = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"];
  const attendance = students.flatMap((st, i) =>
    dates.map((date, di) => ({
      id: `att-${st.id}-${date}`,
      studentId: st.id,
      courseId: "c4",
      date,
      status: (i + di) % 7 === 0 ? ("absent" as const) : (i + di) % 5 === 0 ? ("late" as const) : ("present" as const),
      markedBy: "t1",
    })),
  );

  const exams = [
    { id: "e1", name: "Sessional 1 — Anatomy", courseId: "c4", date: "2026-09-20", maxMarks: 30 },
    { id: "e2", name: "Sessional 1 — Organic Chemistry", courseId: "c5", date: "2026-09-22", maxMarks: 30 },
    { id: "e3", name: "Mid term — Pharmaceutics", courseId: "c6", date: "2026-10-05", maxMarks: 50 },
  ];

  const marks = students.flatMap((st, i) =>
    exams.map((ex, ei) => ({
      id: `m-${st.id}-${ex.id}`,
      examId: ex.id,
      studentId: st.id,
      marks: Math.min(ex.maxMarks, 18 + ((i * 3 + ei * 5) % (ex.maxMarks - 8))),
    })),
  );

  const fees = students.flatMap((st, i) => [
    {
      id: `f-${st.id}-1`,
      studentId: st.id,
      term: "Term 1 2026-27",
      amount: st.courseId === "c2" ? 35000 : 62000,
      dueDate: "2026-08-15",
      status: i < 5 ? ("paid" as const) : ("due" as const),
      paidAt: i < 5 ? "2026-08-02" : undefined,
      method: i < 5 ? "GP Pay" : undefined,
      txnId: i < 5 ? `GPX${1000 + i}` : undefined,
    },
    {
      id: `f-${st.id}-2`,
      studentId: st.id,
      term: "Exam fee Sep 2026",
      amount: 2500,
      dueDate: "2026-09-18",
      status: i % 3 === 0 ? ("paid" as const) : ("due" as const),
      paidAt: i % 3 === 0 ? "2026-09-01" : undefined,
      method: i % 3 === 0 ? "GP Pay" : undefined,
      txnId: i % 3 === 0 ? `GPX${2000 + i}` : undefined,
    },
  ]);

  const notices = [
    {
      id: "n1",
      title: "Sessional exam dates",
      body: "Sessional 1 starts on 20 Sep. Please check the exam page for your paper list.",
      channels: ["inapp", "email", "sms"] as ("inapp" | "email" | "sms")[],
      audience: ["all"] as ["all"],
      urgent: false,
      createdAt: "2026-09-10T09:00:00.000Z",
      createdBy: "u1",
      status: "sent" as const,
      deliveryNote: "Demo send. MSG91 and email keys are not set.",
    },
    {
      id: "n2",
      title: "Bus timing change",
      body: "Route 1 will leave 10 minutes early from Monday.",
      channels: ["inapp", "whatsapp"] as ("inapp" | "whatsapp")[],
      audience: ["student", "parent"] as Role[],
      urgent: true,
      createdAt: "2026-09-12T06:30:00.000Z",
      createdBy: "u1",
      status: "sent" as const,
      deliveryNote: "In-app alert saved. WhatsApp queued for MSG91.",
    },
  ];

  const messages = [
    {
      id: "msg1",
      title: "Welcome to the new college portal",
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
  ];

  const routes = [
    { id: "r1", name: "Route 1 — City", vehicleNo: "MH12-GP-4411", driver: "Sanjay More", driverPhone: "9888800001", stops: "Swargate, Camp, College", seats: 32 },
    { id: "r2", name: "Route 2 — West", vehicleNo: "MH12-GP-2290", driver: "Raju Shinde", driverPhone: "9888800002", stops: "Kothrud, Baner, College", seats: 28 },
  ];

  const books = [
    { id: "b1", isbn: "978-81-203-1234-1", title: "Rang and Dale Pharmacology", author: "Humphrey Rang", copies: 8 },
    { id: "b2", isbn: "978-81-203-5678-2", title: "Remington: The Science of Pharmacy", author: "Allen Loyd", copies: 5 },
    { id: "b3", isbn: "978-81-203-9012-3", title: "Organic Chemistry", author: "Morrison & Boyd", copies: 10 },
    { id: "b4", isbn: "978-81-203-3456-4", title: "Pharmacognosy", author: "C.K. Kokate", copies: 6 },
    { id: "b5", isbn: "978-81-203-7890-5", title: "Pharmaceutics I", author: "R.M. Mehta", copies: 7 },
  ];

  const checkouts = [
    { id: "ch1", bookId: "b1", studentId: "st1", issuedOn: "2026-09-02", dueOn: "2026-09-16" },
    { id: "ch2", bookId: "b3", studentId: "st2", issuedOn: "2026-08-20", dueOn: "2026-09-03", returnedOn: "2026-09-01" },
    { id: "ch3", bookId: "b5", studentId: "st5", issuedOn: "2026-09-08", dueOn: "2026-09-22" },
  ];

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
    fees,
    notices,
    messages,
    routes,
    books,
    checkouts,
    auditLogs: [
      {
        id: "a0",
        at: "2026-09-01T08:00:00.000Z",
        actorId: "u1",
        actorName: "College Admin",
        action: "seed",
        entity: "system",
        entityId: "seed",
        details: "College data loaded for first use.",
        online: true,
      },
    ],
  };
}
