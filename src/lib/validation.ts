import type { Attendance, Book, BusRoute, Course, Exam, Fee, Mark, Staff, Student } from "./types";
import { type CatalogSlice, validateStudentPlacement } from "./catalog";

export type FieldErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s]{8,15}$/;

export function validateStudent(s: Partial<Student>, catalog?: CatalogSlice): FieldErrors {
  const e: FieldErrors = {};
  if (!s.rollNo?.trim()) e.rollNo = "Admission / roll number is required.";
  if (!s.name?.trim()) e.name = "Student name is required.";
  if (!s.dob) e.dob = "Date of birth is required.";
  if (!s.gender) e.gender = "Gender is required.";
  if (!s.phone?.trim() || !PHONE.test(s.phone.trim())) e.phone = "Enter a valid phone number.";
  if (!s.email?.trim() || !EMAIL.test(s.email.trim())) e.email = "Enter a valid email.";
  if (!s.parentName?.trim()) e.parentName = "Parent / guardian name is required.";
  if (!s.parentPhone?.trim() || !PHONE.test(s.parentPhone.trim())) e.parentPhone = "Enter a valid parent / guardian phone.";
  if (s.parentEmail?.trim() && !EMAIL.test(s.parentEmail.trim())) e.parentEmail = "Enter a valid parent email, or leave it blank.";
  if (!s.address?.trim()) e.address = "Address is required.";
  if (!s.status) e.status = "Admission status is required.";
  Object.assign(e, catalog ? validateStudentPlacement(s, catalog) : {
    ...(s.courseId ? {} : { courseId: "Programme is required." }),
    ...(s.sectionId ? {} : { sectionId: "Section is required." }),
    ...(s.departmentId ? {} : { departmentId: "Department is required." }),
  });
  return e;
}

export function validatePortalPassword(password: string, email: string) {
  const e: FieldErrors = {};
  if (!email.trim() || !EMAIL.test(email.trim())) e.email = "A valid email is required to create a login.";
  if (password.length < 8) e.password = "Portal password must be at least 8 characters.";
  return e;
}

export function validateStaff(t: Partial<Staff>): FieldErrors {
  const e: FieldErrors = {};
  if (!t.staffCode?.trim()) e.staffCode = "Employee ID is required.";
  if (!t.name?.trim()) e.name = "Staff name is required.";
  if (!t.departmentId) e.departmentId = "Department is required.";
  if (!t.title?.trim()) e.title = "Designation is required.";
  if (!t.phone?.trim() || !PHONE.test(t.phone.trim())) e.phone = "Enter a valid phone number.";
  if (!t.email?.trim() || !EMAIL.test(t.email.trim())) e.email = "Enter a valid email.";
  return e;
}

export function validateCourse(c: Partial<Course>): FieldErrors {
  const e: FieldErrors = {};
  if (!c.code?.trim()) e.code = "Course code is required.";
  if (!c.name?.trim()) e.name = "Course name is required.";
  if (!c.departmentId) e.departmentId = "Department is required.";
  if (!c.years || c.years < 1) e.years = "Duration must be at least 1 year / semester block.";
  if (!c.kind) e.kind = "Course type is required.";
  return e;
}

export function validateAttendance(a: Partial<Attendance>): FieldErrors {
  const e: FieldErrors = {};
  if (!a.studentId) e.studentId = "Student is required.";
  if (!a.date) e.date = "Date is required.";
  if (!a.courseId) e.courseId = "Subject / class is required.";
  if (!a.status) e.status = "Attendance status is required.";
  if (!["present", "absent", "late"].includes(a.status ?? "")) e.status = "Status must be present, absent, or late.";
  return e;
}

export function validateExam(x: Partial<Exam>): FieldErrors {
  const e: FieldErrors = {};
  if (!x.name?.trim()) e.name = "Exam name is required.";
  if (!x.courseId) e.courseId = "Subject is required.";
  if (!x.date) e.date = "Exam date is required.";
  if (!x.maxMarks || x.maxMarks < 1) e.maxMarks = "Maximum marks must be at least 1.";
  return e;
}

export function validateMark(m: Partial<Mark>, maxMarks: number): FieldErrors {
  const e: FieldErrors = {};
  if (!m.studentId) e.studentId = "Student is required.";
  if (!m.examId) e.examId = "Exam is required.";
  if (typeof m.marks !== "number" || Number.isNaN(m.marks)) e.marks = "Marks are required.";
  else if (m.marks < 0) e.marks = "Marks cannot be negative.";
  else if (m.marks > maxMarks) e.marks = `Marks cannot exceed ${maxMarks}.`;
  if (!maxMarks || maxMarks < 1) e.maxMarks = "Maximum marks are invalid.";
  return e;
}

export function validateFee(f: Partial<Fee>): FieldErrors {
  const e: FieldErrors = {};
  if (!f.studentId) e.studentId = "Student is required.";
  if (!f.term?.trim()) e.term = "Fee type / term is required.";
  if (!f.amount || f.amount < 1) e.amount = "Amount must be greater than zero.";
  if (!f.dueDate) e.dueDate = "Due date is required.";
  if (!f.status) e.status = "Fee status is required.";
  return e;
}

export function validateBook(b: Partial<Book>): FieldErrors {
  const e: FieldErrors = {};
  if (!b.title?.trim()) e.title = "Book title is required.";
  if (!b.isbn?.trim()) e.isbn = "ISBN is required.";
  if (!b.copies || b.copies < 1) e.copies = "At least one copy is required.";
  return e;
}

export function validateRoute(r: Partial<BusRoute>): FieldErrors {
  const e: FieldErrors = {};
  if (!r.name?.trim()) e.name = "Route name is required.";
  if (!r.vehicleNo?.trim()) e.vehicleNo = "Vehicle number is required.";
  if (!r.seats || r.seats < 1) e.seats = "Capacity must be at least 1.";
  return e;
}

export function firstError(errors: FieldErrors) {
  return Object.values(errors)[0] ?? null;
}
