import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { getUserDetail } from "@/lib/data/users";
import { Avatar } from "@/components/layout/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/layout";
import { SubmissionGrader } from "@/components/admin/grading";
import { MemberActions } from "@/components/admin/member-actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "User" };

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  await connection();
  const viewer = await requireStaffPage({ adminOnly: true });
  if (!isSupabaseConfigured) notFound();
  const { id } = await params;
  const u = await getUserDetail(id);
  if (!u) notFound();
  const name = u.profile?.full_name || u.email.split("@")[0];
  const courseById = new Map(u.courses.map((c) => [c.id, c]));
  const best = (quizId: string) => {
    const scores = u.quizzes.filter((q) => q.quiz_id === quizId).map((q) => q.score);
    return scores.length ? Math.max(...scores) : null;
  };

  return (
    <div className="grid max-w-5xl gap-8">
      <Link href="/admin/users" className="text-sm text-teal-700 hover:underline">
        ← All users
      </Link>
      <header className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-white p-6">
        <Avatar src={u.profile?.avatar_url} name={name} className="size-16 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-navy-950">{name}</h1>
          <p className="text-sm text-muted">{u.email}</p>
          <p className="mt-1 text-xs text-muted">
            Joined {formatDate(u.createdAt)} · last seen {u.lastSignInAt ? formatDate(u.lastSignInAt) : "never"}
            {!u.confirmed ? " · email not confirmed" : ""}
          </p>
          {u.profile?.headline ? <p className="mt-2 text-sm text-navy-900">{u.profile.headline}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="navy">{u.role}</Badge>
          <Badge tone="teal">
            Practice: {u.attempts.correct}/{u.attempts.total} correct
          </Badge>
          <Badge tone="green">{u.certificates.length} certificates</Badge>
        </div>
        <div className="w-full border-t border-line pt-4">
          <MemberActions user={{ id: u.id, email: u.email, name }} canRemove={u.id !== viewer.id && u.role !== "admin"} afterRemove="/admin/users" />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-bold text-navy-950">Courses and progress</h2>
        {u.enrollments.length ? (
          <ul className="grid gap-3">
            {u.enrollments.map((e) => {
              const c = courseById.get(e.course_id);
              const done = u.progress.filter((p) => p.course_id === e.course_id).length;
              const total = c?.lessonIds.length ?? 0;
              return (
                <li key={e.id} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/courses/${e.course_id}`} className="font-semibold text-navy-950 hover:underline">
                      {c?.title ?? e.course_id}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <Badge tone={e.status === "requested" ? "amber" : e.status === "completed" ? "green" : "teal"}>{e.status}</Badge>
                      since {formatDate(e.created_at)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={total ? (done / total) * 100 : 0} label="Lesson progress" className="flex-1" />
                    <span className="w-24 text-right text-xs text-muted">
                      {done}/{total} lessons
                    </span>
                  </div>
                  {c?.quizzes.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                      {c.quizzes.map((q) => {
                        const b = best(q.id);
                        return (
                          <li key={q.id}>
                            <Badge tone={b === null ? "gray" : b >= 70 ? "green" : "amber"}>
                              {q.title}: {b === null ? "not taken" : `${b}%`}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Not enrolled in any course yet">Use “Enroll in” on the Users page to add them to a course.</EmptyState>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-navy-950">Assignments</h2>
        {u.submissions.length ? (
          <ul className="grid gap-3">
            {u.submissions.map((s) => {
              const c = courseById.get(s.course_id);
              return (
                <SubmissionGrader
                  key={s.id}
                  s={{
                    id: s.id,
                    courseTitle: c?.title ?? s.course_id,
                    assignmentTitle: c?.assignments.find((a) => a.id === s.assignment_id)?.title ?? s.assignment_id,
                    body: s.body,
                    link: s.link,
                    filePath: s.file_path,
                    fileName: s.file_name,
                    score: s.score,
                    maxScore: s.max_score,
                    feedback: s.feedback,
                    createdAt: s.created_at,
                    gradedAt: s.graded_at,
                  }}
                />
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No submissions yet" />
        )}
      </section>

      {u.certificates.length ? (
        <section>
          <h2 className="mb-3 text-xl font-bold text-navy-950">Certificates</h2>
          <ul className="grid gap-2 text-sm">
            {u.certificates.map((c) => (
              <li key={c.certificate_number} className="rounded-xl border border-line bg-white px-4 py-3">
                <span className="font-semibold text-navy-950">{c.course_title}</span> · {c.certificate_number} · {formatDate(c.issued_at)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
