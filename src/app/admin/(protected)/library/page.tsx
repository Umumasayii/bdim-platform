import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { getAllLibraryItems } from "@/lib/data/library";
import { getStore } from "@/lib/data/store";
import { Notice } from "@/components/ui/notice";
import { LibraryAdmin } from "@/components/admin/library-admin";

export const metadata = { title: "Library" };

export default async function AdminLibraryPage() {
  await connection();
  await requireStaffPage();
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Library</h1>
        <Notice tone="info">The library requires Supabase (file storage).</Notice>
      </div>
    );
  }
  const [items, courses] = await Promise.all([getAllLibraryItems(), getStore().listCourses({ includeUnpublished: true })]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-navy-950">Library — books, notes & files</h1>
      <p className="mb-6 mt-1 text-muted">
        Upload resources and choose who can open them. Learners find them on the{" "}
        <Link href="/library" className="font-semibold text-teal-700 underline">
          Library page
        </Link>
        . For files that belong to one lesson, upload them in the lesson editor instead.
      </p>
      <LibraryAdmin items={items} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
    </div>
  );
}
