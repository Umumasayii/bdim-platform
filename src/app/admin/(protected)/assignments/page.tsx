import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { getStore } from "@/lib/data/store";
import { createServiceClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/notice";
import { AssignmentsInbox } from "@/components/admin/assignments-inbox";
import type { GradableSubmission } from "@/components/admin/grading";

export const metadata = { title: "Assignments" };

export default async function AdminAssignmentsPage() {
  await connection();
  await requireStaffPage();
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Assignments</h1>
        <Notice tone="info">Assignment submissions and grading require Supabase.</Notice>
      </div>
    );
  }
  const db = createServiceClient();
  const [subs, profiles, users, courses] = await Promise.all([
    db.from("assignment_submissions").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("profiles").select("id, full_name"),
    db.auth.admin.listUsers({ perPage: 1000 }),
    getStore().listCourses({ includeUnpublished: true }),
  ]);
  const nameById = new Map((profiles.data ?? []).map((p) => [p.id as string, p.full_name as string]));
  const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const rows: GradableSubmission[] = (subs.data ?? []).map((s) => {
    const c = courseById.get(s.course_id);
    return {
      id: s.id,
      learner: nameById.get(s.user_id) || emailById.get(s.user_id) || "Learner",
      courseTitle: c?.title ?? s.course_id,
      assignmentTitle: c?.modules.find((m) => m.assignment?.id === s.assignment_id)?.assignment?.title ?? s.assignment_id,
      body: s.body,
      link: s.link,
      filePath: s.file_path ?? "",
      fileName: s.file_name ?? "",
      score: s.score,
      maxScore: s.max_score,
      feedback: s.feedback,
      createdAt: s.created_at,
      gradedAt: s.graded_at,
    };
  });
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-navy-950">Assignments</h1>
      <p className="mb-6 mt-1 text-muted">Learners&apos; submissions. Grade them here — learners see the score and feedback on their dashboard and receive an email.</p>
      <AssignmentsInbox rows={rows} />
    </div>
  );
}
