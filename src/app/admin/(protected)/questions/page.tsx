import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Questions" };

export default async function AdminQuestionsPage() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  const questions = await getStore().listQuestions({ includeUnpublished: true });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-navy-950">Practice questions</h1>
        <ButtonLink href="/admin/questions/new" variant="teal">
          <Plus className="size-4" aria-hidden /> New question
        </ButtonLink>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {questions.map((q) => (
              <tr key={q.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/questions/${q.id}`} className="font-semibold text-navy-950 hover:text-teal-700 hover:underline">
                    {q.title}
                  </Link>
                  {q.isSample ? <Badge tone="amber" className="ml-2">Sample</Badge> : null}
                </td>
                <td className="px-4 py-3 text-muted">
                  {q.topic} · {q.difficulty}
                </td>
                <td className="px-4 py-3 text-muted">{q.type}</td>
                <td className="px-4 py-3 text-muted">{q.free ? "Free" : "Members"}</td>
                <td className="px-4 py-3">{q.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
