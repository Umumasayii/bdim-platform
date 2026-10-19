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
  /** Last time they used the website (more accurate than last sign-in). */
  lastSeenAt: string;
  gender: string;
  country: string;
  province: string;
  city: string;
  organization: string;
  occupation: string;
  interests: string[];
  phone: string;
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
    db.from("profiles").select("id, full_name, avatar_url, last_seen_at, gender, country, province, city, organization, occupation, interests, phone"),
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

  const text = (id: string, key: string) => ((prof.get(id) as Record<string, unknown> | undefined)?.[key] as string | null) ?? "";
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
      lastSeenAt: text(u.id, "last_seen_at"),
      gender: text(u.id, "gender"),
      country: text(u.id, "country"),
      province: text(u.id, "province"),
      city: text(u.id, "city"),
      organization: text(u.id, "organization"),
      occupation: text(u.id, "occupation"),
      interests: ((prof.get(u.id) as { interests?: string[] } | undefined)?.interests ?? []) as string[],
      phone: text(u.id, "phone"),
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
    profile: profile.data as {
      full_name: string;
      headline: string;
      bio: string;
      avatar_url: string;
      gender: string;
      country: string;
      province: string;
      city: string;
      organization: string;
      occupation: string;
      interests: string[];
      phone: string;
    } | null,
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

export type Tally = { label: string; count: number }[];

export interface UserStats {
  total: number;
  confirmed: number;
  newLast7Days: number;
  newLast30Days: number;
  activeLast7Days: number;
  activeLast30Days: number;
  /** Gave gender, location and at least one interest. */
  completeProfiles: number;
  roles: { admin: number; instructor: number; learner: number };
  gender: Tally;
  countries: Tally;
  /** "Province, Country". */
  provinces: Tally;
  /** "District, Province, Country". */
  districts: Tally;
  occupations: Tally;
  organizations: Tally;
  interests: Tally;
  /** Sign-ups per week, oldest first: label is the week's Monday (YYYY-MM-DD). */
  signupsByWeek: Tally;
}

const NOT_GIVEN = "Not given";

function tally(values: string[]): Tally {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (a.label === NOT_GIVEN ? 1 : 0) - (b.label === NOT_GIVEN ? 1 : 0) || b.count - a.count || a.label.localeCompare(b.label));
}

/** Monday (UTC) of the week containing `ms`, as YYYY-MM-DD. */
function weekStart(ms: number) {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

/** Counts for the admin dashboards. `nowMs` is passed in so the page decides the time. */
export function userStats(rows: UserRow[], nowMs: number, weeks = 12): UserStats {
  const since = (days: number) => nowMs - days * 86_400_000;
  const genderName: Record<string, string> = { female: "Female", male: "Male", prefer_not_to_say: "Prefer not to say" };
  const join = (...parts: string[]) => parts.filter(Boolean).join(", ");
  const weekLabels = Array.from({ length: weeks }, (_, i) => weekStart(nowMs - (weeks - 1 - i) * 7 * 86_400_000));
  const signups = new Map(weekLabels.map((w) => [w, 0]));
  rows.forEach((r) => {
    const w = weekStart(Date.parse(r.createdAt));
    if (signups.has(w)) signups.set(w, (signups.get(w) ?? 0) + 1);
  });
  return {
    total: rows.length,
    confirmed: rows.filter((r) => r.confirmed).length,
    newLast7Days: rows.filter((r) => Date.parse(r.createdAt) >= since(7)).length,
    newLast30Days: rows.filter((r) => Date.parse(r.createdAt) >= since(30)).length,
    activeLast7Days: rows.filter((r) => r.lastSeenAt && Date.parse(r.lastSeenAt) >= since(7)).length,
    activeLast30Days: rows.filter((r) => r.lastSeenAt && Date.parse(r.lastSeenAt) >= since(30)).length,
    completeProfiles: rows.filter((r) => r.gender && r.country && r.interests.length).length,
    roles: {
      admin: rows.filter((r) => r.role === "admin").length,
      instructor: rows.filter((r) => r.role === "instructor").length,
      learner: rows.filter((r) => r.role === "learner").length,
    },
    gender: tally(rows.map((r) => genderName[r.gender] ?? NOT_GIVEN)),
    countries: tally(rows.map((r) => r.country || NOT_GIVEN)),
    provinces: tally(rows.filter((r) => r.province).map((r) => join(r.province, r.country))),
    districts: tally(rows.filter((r) => r.city).map((r) => join(r.city, r.province, r.country))),
    occupations: tally(rows.map((r) => r.occupation || NOT_GIVEN)),
    organizations: tally(rows.filter((r) => r.organization.trim()).map((r) => r.organization.trim())),
    interests: tally(rows.flatMap((r) => r.interests)),
    signupsByWeek: weekLabels.map((label) => ({ label, count: signups.get(label) ?? 0 })),
  };
}
