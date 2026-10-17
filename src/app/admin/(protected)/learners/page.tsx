import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { getStore } from "@/lib/data/store";
import { createUserClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/notice";
import Link from "next/link";
import { EnrollmentsTable, type EnrollmentRow } from "@/components/admin/learner-admin";

export const metadata = { title: "Learners" };

export default async function AdminLearnersPage() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Learners</h1>
        <Notice tone="info" title="Requires learner accounts">
          In demo mode, enrollments, progress and submissions are stored in each learner&apos;s own browser, so they can&apos;t be reviewed here.
          Configure Supabase to manage enrollments, monitor progress and review assignments.
        </Notice>
      </div>
    );
  }
  const db = await createUserClient();
  const [courses, enr, prog, profiles] = await Promise.all([
    getStore().listCourses({ includeUnpublished: true }),
    db.from("enrollments").select("id,user_id,course_id,status,created_at").order("created_at", { ascending: false }).limit(500),
    db.from("lesson_progress").select("user_id,course_id"),
    db.from("profiles").select("id,full_name"),
  ]);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const nameById = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.full_name as string) || "Learner"]));
  const doneByKey = new Map<string, number>();
  (prog.data ?? []).forEach((p) => doneByKey.set(`${p.user_id}:${p.course_id}`, (doneByKey.get(`${p.user_id}:${p.course_id}`) ?? 0) + 1));

  const enrollmentRows: EnrollmentRow[] = (enr.data ?? [])
    .map((e) => {
      const c = courseById.get(e.course_id);
      return {
        id: e.id,
        learner: nameById.get(e.user_id) ?? "Learner",
        courseTitle: c?.title ?? e.course_id,
        status: e.status,
        createdAt: e.created_at,
        done: doneByKey.get(`${e.user_id}:${e.course_id}`) ?? 0,
        total: c ? c.modules.reduce((n, m) => n + m.lessons.length, 0) : 0,
      };
    })
    .sort((a, b) => Number(b.status === "requested") - Number(a.status === "requested"));

  return (
    <div className="grid gap-10">
      <section>
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Enrollment requests</h1>
        {enr.error ? <Notice tone="error">{enr.error.message}</Notice> : <EnrollmentsTable rows={enrollmentRows} />}
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold text-navy-950">Assignment submissions</h2>
        <p className="text-sm text-muted">
          Grade submissions in <Link href="/admin/assignments" className="font-semibold text-teal-700 underline">Assignments &amp; grades</Link>.
        </p>
      </section>
    </div>
  );
}
