export type Role = "admin" | "staff" | "student" | "parent";

export type Channel = "whatsapp" | "sms" | "email" | "inapp";

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  phone: string;
  staffId?: string;
  studentId?: string;
  childStudentId?: string;
  active: boolean;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  head: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  years: number;
  credits: number;
};

export type Section = {
  id: string;
  name: string;
  courseId: string;
  year: number;
  room: string;
};

export type Student = {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  gender: "Female" | "Male";
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  departmentId: string;
  courseId: string;
  sectionId: string;
  year: number;
  address: string;
  status: "active" | "left";
  busRouteId?: string;
};

export type Staff = {
  id: string;
  staffCode: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  departmentId: string;
  joinedOn: string;
  status: "active" | "left";
};

export type TimetableSlot = {
  id: string;
  sectionId: string;
  day: string;
  period: string;
  courseId: string;
  staffId: string;
  room: string;
};

export type Attendance = {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: "present" | "absent" | "late";
  markedBy: string;
};

export type Exam = {
  id: string;
  name: string;
  courseId: string;
  date: string;
  maxMarks: number;
};

export type Mark = {
  id: string;
  examId: string;
  studentId: string;
  marks: number;
};

export type Fee = {
  id: string;
  studentId: string;
  term: string;
  amount: number;
  dueDate: string;
  status: "paid" | "due" | "late";
  paidAt?: string;
  method?: string;
  txnId?: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  channels: Channel[];
  audience: Role[] | ["all"];
  urgent: boolean;
  createdAt: string;
  createdBy: string;
  status: "sent" | "queued" | "failed";
  deliveryNote: string;
};

export type Message = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  fromUserId: string;
  audience: string;
  createdAt: string;
};

export type BusRoute = {
  id: string;
  name: string;
  vehicleNo: string;
  driver: string;
  driverPhone: string;
  stops: string;
  seats: number;
};

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  copies: number;
};

export type Checkout = {
  id: string;
  bookId: string;
  studentId: string;
  issuedOn: string;
  dueOn: string;
  returnedOn?: string;
};

export type AuditLog = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  online: boolean;
};

export type AppState = {
  users: User[];
  departments: Department[];
  courses: Course[];
  sections: Section[];
  students: Student[];
  staff: Staff[];
  timetable: TimetableSlot[];
  attendance: Attendance[];
  exams: Exam[];
  marks: Mark[];
  fees: Fee[];
  notices: Notice[];
  messages: Message[];
  routes: BusRoute[];
  books: Book[];
  checkouts: Checkout[];
  auditLogs: AuditLog[];
};

export const EMPTY_STATE: AppState = {
  users: [],
  departments: [],
  courses: [],
  sections: [],
  students: [],
  staff: [],
  timetable: [],
  attendance: [],
  exams: [],
  marks: [],
  fees: [],
  notices: [],
  messages: [],
  routes: [],
  books: [],
  checkouts: [],
  auditLogs: [],
};
