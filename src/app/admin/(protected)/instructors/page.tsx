import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { InstructorEditor } from "@/components/admin/people-editors";

export const metadata = { title: "Instructors" };

export default async function AdminInstructorsPage() {
  await connection();
  await requireStaffPage({ adminOnly: true });
  const instructors = await getStore().listInstructors({ includeUnpublished: true });
  return (
    <div className="grid max-w-4xl gap-6">
      <h1 className="text-3xl font-bold text-navy-950">Instructor profiles</h1>
      {instructors.map((p) => (
        <InstructorEditor key={p.id} profile={p} />
      ))}
    </div>
  );
}
