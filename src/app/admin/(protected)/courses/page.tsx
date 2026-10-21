import { connection } from "next/server";
import { Plus } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { categories } from "@/content/categories";
import { getStore } from "@/lib/data/store";
import { courseLessonCount } from "@/lib/data/sanitize";
import { createUserClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { CoursesBoard, type CourseRow } from "@/components/admin/courses-board";

export const metadata = { title: "Courses" };

/** Enrolled (active/completed) and waiting (requested) learners per course. */
async function enrollmentCounts() {
  const counts = new Map<string, { enrolled: number; pending: number }>();
  if (!isSupabaseConfigured) return counts;
  const db = await createUserClient();
  const { data } = await db.from("enrollments").select("course_id, status");
  for (const e of (data ?? []) as { course_id: string; status: string }[]) {
    const c = counts.get(e.course_id) ?? { enrolled: 0, pending: 0 };
    if (e.status === "active" || e.status === "completed") c.enrolled++;
    else if (e.status === "requested") c.pending++;
    counts.set(e.course_id, c);
  }
  return counts;
}

export default async function AdminCoursesPage() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  const viewer = await requireStaffPage();
  const [courses, counts] = await Promise.all([getStore().listCourses({ includeUnpublished: true }), enrollmentCounts()]);
  const rows: CourseRow[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    categoryId: c.category,
    categoryShort: categories.find((x) => x.id === c.category)?.short ?? c.category,
    level: c.level,
    lessons: courseLessonCount(c),
    modules: c.modules.length,
    enrollmentMode: c.enrollmentMode,
    published: c.published,
    featured: c.featured,
    enrolled: counts.get(c.id)?.enrolled ?? 0,
    pending: counts.get(c.id)?.pending ?? 0,
  }));
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-950">Courses & lessons</h1>
          <p className="mt-1 text-muted">Publish or hide courses, choose what appears on the homepage, set the order, and edit or delete.</p>
        </div>
        <ButtonLink href="/admin/courses/new" variant="teal">
          <Plus className="size-4" aria-hidden /> New course
        </ButtonLink>
      </div>
      <CoursesBoard rows={rows} categories={categories.map((c) => ({ id: c.id, short: c.short }))} isAdmin={viewer.role === "admin"} />
    </div>
  );
}
