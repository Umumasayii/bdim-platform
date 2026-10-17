import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { getStore } from "./store";

/*
  Admin-only user directory. Uses the service-role client (auth users are not
  readable otherwise), so every caller must authorise with requireStaff first.
*/

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: "learner" | "instructor" | "admin";
  createdAt: string;
  lastSignInAt: string;
  confirmed: boolean;
  courses: number;
  lessonsDone: number;
  toGrade: number;
}

async function allAuthUsers() {
  const db = createServiceClient();
  const users = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  return users;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = createServiceClient();
  const [users, profiles, roles, enrollments, progress, submissions] = await Promise.all([
    allAuthUsers(),
    db.from("profiles").select("id, full_name, avatar_url"),
    db.from("staff_roles").select("user_id, role"),
    db.from("enrollments").select("user_id, status"),
    db.from("lesson_progress").select("user_id"),
    db.from("assignment_submissions").select("user_id, graded_at"),
  ]);
  const count = <T extends { user_id: string }>(rows: T[] | null, pred: (r: T) => boolean = () => true) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => pred(r) && m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return m;
  };
  const prof = new Map((profiles.data ?? []).map((p) => [p.id as string, p]));
  const role = new Map((roles.data ?? []).map((r) => [r.user_id as string, r.role as UserRow["role"]]));
  const courses = count(enrollments.data as { user_id: string; status: string }[] | null, (r) => r.status !== "cancelled");
  const lessons = count(progress.data as { user_id: string }[] | null);
  const toGrade = count(submissions.data as { user_id: string; graded_at: string | null }[] | null, (r) => !r.graded_at);

  return users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      fullName: (prof.get(u.id)?.full_name as string) || "",
      avatarUrl: (prof.get(u.id)?.avatar_url as string) || "",
      role: role.get(u.id) ?? "learner",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? "",
      confirmed: Boolean(u.email_confirmed_at),
      courses: courses.get(u.id) ?? 0,
      lessonsDone: lessons.get(u.id) ?? 0,
      toGrade: toGrade.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserDetail(userId: string) {
  const db = createServiceClient();
  const { data: auth, error } = await db.auth.admin.getUserById(userId);
  if (error || !auth.user) return null;
  const [profile, role, enrollments, progress, quizzes, submissions, certificates, attempts, courses] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("staff_roles").select("role").eq("user_id", userId).maybeSingle(),
    db.from("enrollments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("lesson_progress").select("lesson_id, course_id, completed_at").eq("user_id", userId),
    db.from("quiz_submissions").select("quiz_id, course_id, score, passed, created_at").eq("user_id", userId),
    db.from("assignment_submissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("certificates").select("*").eq("user_id", userId),
    db.from("practice_attempts").select("correct").eq("user_id", userId),
    getStore().listCourses({ includeUnpublished: true }).catch(() => []),
  ]);
  return {
    id: userId,
    email: auth.user.email ?? "",
    createdAt: auth.user.created_at,
    lastSignInAt: auth.user.last_sign_in_at ?? "",
    confirmed: Boolean(auth.user.email_confirmed_at),
    profile: profile.data as { full_name: string; headline: string; bio: string; avatar_url: string } | null,
    role: ((role.data?.role as string) ?? "learner") as UserRow["role"],
    enrollments: (enrollments.data ?? []) as { id: string; course_id: string; status: string; created_at: string }[],
    progress: (progress.data ?? []) as { lesson_id: string; course_id: string; completed_at: string }[],
    quizzes: (quizzes.data ?? []) as { quiz_id: string; course_id: string; score: number; passed: boolean; created_at: string }[],
    submissions: (submissions.data ?? []) as {
      id: string;
      course_id: string;
      assignment_id: string;
      body: string;
      link: string;
      file_path: string;
      file_name: string;
      status: string;
      score: number | null;
      max_score: number | null;
      feedback: string;
      created_at: string;
      graded_at: string | null;
    }[],
    certificates: (certificates.data ?? []) as { certificate_number: string; course_title: string; issued_at: string }[],
    attempts: { total: attempts.data?.length ?? 0, correct: (attempts.data ?? []).filter((a) => a.correct).length },
    courses: courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      lessonIds: c.modules.flatMap((m) => m.lessons.map((l) => l.id)),
      quizzes: c.modules.flatMap((m) => (m.quiz ? [{ id: m.quiz.id, title: m.quiz.title }] : [])),
      assignments: c.modules.flatMap((m) => (m.assignment ? [{ id: m.assignment.id, title: m.assignment.title }] : [])),
    })),
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;
