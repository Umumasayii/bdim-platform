import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { listUsers } from "@/lib/data/users";
import { getStore } from "@/lib/data/store";
import { Notice } from "@/components/ui/notice";
import { UsersTable } from "@/components/admin/users-admin";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await connection();
  const viewer = await requireStaffPage({ adminOnly: true });
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Users</h1>
        <Notice tone="info">User accounts require Supabase.</Notice>
      </div>
    );
  }
  const [users, courses] = await Promise.all([listUsers(), getStore().listCourses({ includeUnpublished: true })]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-navy-950">Users</h1>
      <p className="mb-6 mt-1 text-muted">Everyone who has created an account. Change roles, enroll people in courses, and open their progress.</p>
      <UsersTable users={users} courses={courses.map((c) => ({ id: c.id, title: c.title }))} currentUserId={viewer.id} />
    </div>
  );
}
