export type Role = "admin" | "staff" | "student" | "parent";
export type Channel = "whatsapp" | "sms" | "email" | "inapp";
export type Status = "active" | "left";

export type User = {
  id: string;
  uid?: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  phone: string;
  staffId?: string;
  studentId?: string;
  childStudentId?: string;
  photoUrl?: string;
  active: boolean;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  head: string;
  phone?: string;
  photoUrl?: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  years: number;
  credits: number;
  kind: "programme" | "subject";
};

export type Section = {
  id: string;
  name: string;
  courseId: string;
  year: number;
  room: string;
  capacity: number;
};

export type Student = {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  gender: "Female" | "Male";
  dob: string;
  bloodGroup: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  departmentId: string;
  courseId: string;
  sectionId: string;
  year: number;
  address: string;
  admissionDate: string;
  photoUrl?: string;
  status: Status;
  busRouteId?: string;
};

export type Staff = {
  id: string;
  staffCode: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  qualification: string;
  departmentId: string;
  courseIds: string[];
  joinedOn: string;
  photoUrl?: string;
  status: Status;
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
  sectionId: string;
  date: string;
  status: "present" | "absent" | "late";
  markedBy: string;
};

export type Exam = {
  id: string;
  name: string;
  courseId: string;
  sectionId: string;
  date: string;
  maxMarks: number;
  locked: boolean;
};

export type Mark = {
  id: string;
  examId: string;
  studentId: string;
  marks: number;
};

export type FeePlan = {
  id: string;
  name: string;
  courseId: string;
  year: number;
  amount: number;
  dueDate: string;
};

export type Fee = {
  id: string;
  studentId: string;
  planId?: string;
  term: string;
  amount: number;
  dueDate: string;
  status: "paid" | "due" | "late";
  paidAt?: string;
  method?: string;
  txnId?: string;
  receiptNo?: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  channels: Channel[];
  audience: string;
  sectionId?: string;
  studentId?: string;
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
  sectionId?: string;
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
  photoUrl?: string;
};

export type Book = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  copies: number;
  photoUrl?: string;
};

export type Checkout = {
  id: string;
  bookId: string;
  studentId: string;
  issuedOn: string;
  dueOn: string;
  returnedOn?: string;
  fine?: number;
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
  feePlans: FeePlan[];
  fees: Fee[];
  notices: Notice[];
  messages: Message[];
  routes: BusRoute[];
  books: Book[];
  checkouts: Checkout[];
  auditLogs: AuditLog[];
};

export const COLLECTION_KEYS = [
  "users",
  "departments",
  "courses",
  "sections",
  "students",
  "staff",
  "timetable",
  "attendance",
  "exams",
  "marks",
  "feePlans",
  "fees",
  "notices",
  "messages",
  "routes",
  "books",
  "checkouts",
  "auditLogs",
] as const;

export type CollectionKey = (typeof COLLECTION_KEYS)[number];

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
  feePlans: [],
  fees: [],
  notices: [],
  messages: [],
  routes: [],
  books: [],
  checkouts: [],
  auditLogs: [],
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const PERIODS = ["9:00 AM", "10:00 AM", "11:15 AM", "12:15 PM", "2:00 PM", "3:00 PM"];
