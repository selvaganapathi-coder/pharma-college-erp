import { NextResponse } from "next/server";
import type { Course, Department, Section, Student, User } from "@/lib/types";
import { firstError, validatePortalPassword, validateStudent } from "@/lib/validation";
import { createAuthAccount, deleteAuthAccount, requireOffice, writeFirestoreDoc } from "@/lib/server/office";
import { readFirestoreDoc } from "@/lib/server/session";

function asStudent(body: unknown): Student | null {
  if (!body || typeof body !== "object") return null;
  const s = body as Student;
  if (!s.id || !s.name) return null;
  return s;
}

export async function POST(request: Request) {
  try {
    const { token, session } = await requireOffice(request);
    const body = (await request.json().catch(() => ({}))) as {
      student?: Student;
      createLogin?: boolean;
      password?: string;
      createParentLogin?: boolean;
      parentPassword?: string;
    };
    const studentIn = asStudent(body.student);
    if (!studentIn) return NextResponse.json({ ok: false, note: "Student details are required." }, { status: 400 });
    if ("password" in (studentIn as object)) {
      return NextResponse.json({ ok: false, note: "Passwords cannot be stored on the student record." }, { status: 400 });
    }

    const [department, course, section] = await Promise.all([
      readFirestoreDoc(token, "departments", studentIn.departmentId),
      readFirestoreDoc(token, "courses", studentIn.courseId),
      readFirestoreDoc(token, "sections", studentIn.sectionId),
    ]);
    const catalog = {
      departments: department ? ([{ id: studentIn.departmentId, ...department }] as unknown as Department[]) : [],
      courses: course ? ([{ id: studentIn.courseId, ...course }] as unknown as Course[]) : [],
      sections: section ? ([{ id: studentIn.sectionId, ...section }] as unknown as Section[]) : [],
    };
    const errors = validateStudent(studentIn, catalog);
    const err = firstError(errors);
    if (err) return NextResponse.json({ ok: false, note: err, errors }, { status: 400 });

    if (course && String(course.departmentId) !== studentIn.departmentId) {
      return NextResponse.json({ ok: false, note: "Selected course does not belong to the selected department." }, { status: 400 });
    }
    if (section && String(section.courseId) !== studentIn.courseId) {
      return NextResponse.json({ ok: false, note: "Selected section does not belong to the selected course." }, { status: 400 });
    }

    const student: Student = { ...studentIn };
    delete (student as { password?: string }).password;
    let studentAuthToken: string | null = null;
    let parentAuthToken: string | null = null;

    if (body.createLogin) {
      if (!student.authUid) {
        const loginErr = firstError(validatePortalPassword(String(body.password ?? ""), student.email));
        if (loginErr) return NextResponse.json({ ok: false, note: loginErr }, { status: 400 });
        const made = await createAuthAccount(student.email.trim().toLowerCase(), String(body.password));
        if (!made.ok) return NextResponse.json({ ok: false, note: made.note }, { status: 409 });
        student.authUid = made.uid;
        studentAuthToken = made.idToken;
      }
    }
    if (body.createParentLogin) {
      const loginErr = firstError(validatePortalPassword(String(body.parentPassword ?? ""), student.parentEmail));
      if (loginErr) {
        if (studentAuthToken) await deleteAuthAccount(studentAuthToken);
        return NextResponse.json({ ok: false, note: loginErr }, { status: 400 });
      }
      const made = await createAuthAccount(student.parentEmail.trim().toLowerCase(), String(body.parentPassword));
      if (!made.ok) {
        if (studentAuthToken) await deleteAuthAccount(studentAuthToken);
        return NextResponse.json({ ok: false, note: made.note }, { status: 409 });
      }
      student.parentAuthUid = made.uid;
      parentAuthToken = made.idToken;
    }

    try {
      await writeFirestoreDoc(token, "students", student.id, student as unknown as Record<string, unknown>);
      if (student.authUid) {
        const profile: User = {
          id: student.authUid,
          uid: student.authUid,
          email: student.email.trim().toLowerCase(),
          name: student.name,
          role: "student",
          phone: student.phone,
          active: true,
          studentId: student.id,
        };
        await writeFirestoreDoc(token, "users", student.authUid, profile as unknown as Record<string, unknown>);
      }
      if (student.parentAuthUid) {
        const profile: User = {
          id: student.parentAuthUid,
          uid: student.parentAuthUid,
          email: student.parentEmail.trim().toLowerCase(),
          name: student.parentName,
          role: "parent",
          phone: student.parentPhone,
          active: true,
          childStudentId: student.id,
        };
        await writeFirestoreDoc(token, "users", student.parentAuthUid, profile as unknown as Record<string, unknown>);
      }
    } catch (writeErr) {
      if (studentAuthToken) await deleteAuthAccount(studentAuthToken);
      if (parentAuthToken) await deleteAuthAccount(parentAuthToken);
      return NextResponse.json(
        { ok: false, note: writeErr instanceof Error ? writeErr.message : "Could not save the student record." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      student,
      authUid: student.authUid ?? null,
      parentAuthUid: student.parentAuthUid ?? null,
      actor: session.uid,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, note: err instanceof Error ? err.message : "Student create failed." }, { status: 400 });
  }
}
