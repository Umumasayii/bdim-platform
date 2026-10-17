import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { PathsEditor } from "@/components/admin/paths-editor";

export const metadata = { title: "Learning paths" };

export default async function AdminPathsPage() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  const store = getStore();
  const [paths, courses] = await Promise.all([store.listPaths({ includeUnpublished: true }), store.listCourses({ includeUnpublished: true })]);
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-navy-950">Learning paths</h1>
      <PathsEditor paths={paths} courses={courses.map((c) => ({ slug: c.slug, title: c.title }))} />
    </div>
  );
}
