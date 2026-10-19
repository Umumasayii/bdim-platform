"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { getSubmissionFileUrl, gradeSubmission } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./admin-ui";

export interface GradableSubmission {
  id: string;
  learner?: string;
  courseTitle: string;
  assignmentTitle: string;
  body: string;
  link: string;
  filePath: string;
  fileName: string;
  score: number | null;
  maxScore: number | null;
  feedback: string;
  createdAt: string;
  gradedAt: string | null;
}

export function SubmissionGrader({ s }: { s: GradableSubmission }) {
  const { run, pending, message } = useAdminAction();
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [maxScore, setMaxScore] = useState(s.maxScore?.toString() ?? "100");
  const [feedback, setFeedback] = useState(s.feedback);
  const [fileError, setFileError] = useState<string | null>(null);
  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      {message}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy-950">{s.assignmentTitle}</p>
          <p className="text-xs text-muted">
            {s.learner ? `${s.learner} · ` : ""}
            {s.courseTitle} · submitted {formatDate(s.createdAt)}
          </p>
        </div>
        {s.gradedAt ? (
          <Badge tone="green">
            Graded {s.score} / {s.maxScore}
          </Badge>
        ) : (
          <Badge tone="amber">Needs grading</Badge>
        )}
      </div>
      {s.body ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{s.body}</p> : null}
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {s.filePath ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline"
            onClick={async () => {
              const res = await getSubmissionFileUrl(s.filePath);
              if (res.ok) window.open(res.url, "_blank", "noopener");
              else setFileError(res.message);
            }}
          >
            <Download className="size-4" aria-hidden /> {s.fileName || "Download file"}
          </button>
        ) : null}
        {s.link ? (
          <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:underline">
            <ExternalLink className="size-4" aria-hidden /> Open link
          </a>
        ) : null}
        {fileError ? <span className="text-red-600">{fileError}</span> : null}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-[7rem_7rem_minmax(0,1fr)] sm:items-start">
        <div>
          <label htmlFor={`score-${s.id}`} className="mb-1 block text-xs font-medium">
            Score
          </label>
          <Input id={`score-${s.id}`} type="number" min={0} step="any" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`max-${s.id}`} className="mb-1 block text-xs font-medium">
            Out of
          </label>
          <Input id={`max-${s.id}`} type="number" min={1} step="any" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`fb-${s.id}`} className="mb-1 block text-xs font-medium">
            Feedback for the learner
          </label>
          <Textarea id={`fb-${s.id}`} rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Button
          variant="teal"
          size="sm"
          disabled={pending || score === ""}
          onClick={() => run(() => gradeSubmission({ id: s.id, score: Number(score), maxScore: Number(maxScore), feedback }))}
        >
          {s.gradedAt ? "Update grade" : "Save grade"}
        </Button>
      </div>
    </li>
  );
}
