"use client";

import { useState } from "react";
import { reviewAssignment, setEnrollmentStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./admin-ui";

export interface EnrollmentRow {
  id: string;
  learner: string;
  courseTitle: string;
  status: string;
  createdAt: string;
  done: number;
  total: number;
}

export interface SubmissionRow {
  id: string;
  learner: string;
  courseTitle: string;
  assignmentTitle: string;
  body: string;
  link: string;
  status: string;
  feedback: string;
  createdAt: string;
}

export function EnrollmentsTable({ rows }: { rows: EnrollmentRow[] }) {
  const { run, pending, message } = useAdminAction();
  if (!rows.length) return <EmptyState title="No enrollments yet" />;
  return (
    <div>
      {message}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <span className="font-medium text-navy-950">{r.learner}</span>
                  <span className="block text-xs text-muted">since {formatDate(r.createdAt)}</span>
                </td>
                <td className="px-4 py-3 text-muted">{r.courseTitle}</td>
                <td className="w-40 px-4 py-3">
                  <ProgressBar value={r.total ? (r.done / r.total) * 100 : 0} label={`${r.learner} progress`} />
                  <span className="text-xs text-muted">
                    {r.done}/{r.total}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.status === "requested" ? "amber" : r.status === "active" ? "teal" : r.status === "completed" ? "green" : "gray"}>{r.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.status === "requested" || r.status === "cancelled" ? (
                      <Button size="sm" variant="teal" disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, "active"))}>
                        Approve
                      </Button>
                    ) : null}
                    {r.status !== "cancelled" && r.status !== "completed" ? (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, "cancelled"))}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmissionCard({ s }: { s: SubmissionRow }) {
  const [feedback, setFeedback] = useState(s.feedback);
  const { run, pending, message } = useAdminAction();
  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      {message}
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-semibold text-navy-950">{s.assignmentTitle}</p>
          <p className="text-xs text-muted">
            {s.learner} · {s.courseTitle} · {formatDate(s.createdAt)}
          </p>
        </div>
        <Badge tone={s.status === "reviewed" ? "green" : "amber"}>{s.status}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{s.body}</p>
      {s.link ? (
        <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-teal-700 underline">
          Open submitted link
        </a>
      ) : null}
      <label htmlFor={`fb-${s.id}`} className="mt-3 block text-sm font-medium">
        Feedback
      </label>
      <Textarea id={`fb-${s.id}`} rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Button className="mt-2" size="sm" variant="teal" disabled={pending || !feedback.trim()} onClick={() => run(() => reviewAssignment(s.id, feedback))}>
        Save feedback
      </Button>
    </li>
  );
}

export function SubmissionsList({ rows }: { rows: SubmissionRow[] }) {
  if (!rows.length) return <EmptyState title="No assignment submissions yet" />;
  return (
    <ul className="grid gap-3">
      {rows.map((s) => (
        <SubmissionCard key={s.id} s={s} />
      ))}
    </ul>
  );
}
