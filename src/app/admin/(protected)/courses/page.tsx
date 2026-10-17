import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { Plus } from "lucide-react";
import { categories } from "@/content/categories";
import { getStore } from "@/lib/data/store";
import { courseLessonCount } from "@/lib/data/sanitize";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  const courses = await getStore().listCourses({ includeUnpublished: true });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-navy-950">Courses & lessons</h1>
        <ButtonLink href="/admin/courses/new" variant="teal">
          <Plus className="size-4" aria-hidden /> New course
        </ButtonLink>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Lessons</th>
              <th className="px-4 py-3">Enrollment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {courses.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/courses/${c.id}`} className="font-semibold text-navy-950 hover:text-teal-700 hover:underline">
                    {c.title}
                  </Link>
                  {c.featured ? <Badge tone="teal" className="ml-2">Featured</Badge> : null}
                </td>
                <td className="px-4 py-3 text-muted">{categories.find((x) => x.id === c.category)?.short}</td>
                <td className="px-4 py-3 text-muted">{c.level}</td>
                <td className="px-4 py-3 text-muted">{courseLessonCount(c)}</td>
                <td className="px-4 py-3 text-muted">{c.enrollmentMode === "open" ? "Self-enroll" : "Approval"}</td>
                <td className="px-4 py-3">{c.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
