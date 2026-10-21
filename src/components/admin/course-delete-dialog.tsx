"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { EyeOff, Trash2, X } from "lucide-react";
import { deleteCourse, getCourseImpact, setCoursePublished, type CourseImpact } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

/**
 * Confirms deleting a course. Shows exactly which learner records would be
 * lost, suggests hiding the course instead, and — when learners exist —
 * asks for the course title to be typed.
 */
export function CourseDeleteDialog({
  course,
  onClose,
  onDone,
}: {
  course: { id: string; title: string; published: boolean };
  onClose: () => void;
  /** Called after a successful delete or hide, with a message to show. */
  onDone: (message: string, deleted: boolean) => void;
}) {
  const [impact, setImpact] = useState<CourseImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getCourseImpact(course.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setImpact(res.impact);
      else setError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose, pending]);

  const hasLearners = impact ? Object.values(impact).some((n) => n > 0) : false;
  const titleOk = !hasLearners || typed.trim() === course.title.trim();
  const lines: string[] = impact
    ? (
        [
          [impact.enrolled, "enrolled learner", "enrolled learners"],
          [impact.pending, "pending enrollment request", "pending enrollment requests"],
          [impact.lessonsCompleted, "completed-lesson record", "completed-lesson records"],
          [impact.quizAttempts, "quiz result", "quiz results"],
          [impact.submissions, "assignment submission", "assignment submissions"],
          [impact.certificates, "issued certificate — it will no longer verify", "issued certificates — they will no longer verify"],
        ] as const
      )
        .filter(([n]) => n > 0)
        .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
    : [];

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, deleted: boolean) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) onDone(res.message ?? "Done.", deleted);
      else setError(res.message ?? "Something went wrong.");
    });

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="del-title" className="text-lg font-bold text-navy-950">
            Delete &ldquo;{course.title}&rdquo;?
          </h2>
          <button type="button" aria-label="Cancel" disabled={pending} onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {error ? (
          <Notice tone="error" className="mt-3">
            {error}
          </Notice>
        ) : null}

        {!impact && !error ? <p className="mt-4 text-sm text-muted">Checking what this course is linked to…</p> : null}

        {impact ? (
          hasLearners ? (
            <div className="mt-3 grid gap-3 text-sm">
              <p className="text-navy-900">Deleting is permanent. These learner records would also be removed:</p>
              <ul className="grid gap-1 rounded-xl bg-red-50 p-3 text-red-800">
                {lines.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
              {course.published ? (
                <p className="text-muted">
                  <strong className="text-navy-900">Tip:</strong> hiding the course removes it from the website and homepage but keeps everyone&apos;s progress and certificates.
                </p>
              ) : null}
              <label htmlFor="del-confirm" className="font-medium text-navy-900">
                To delete anyway, type the course title: <span className="font-semibold">{course.title}</span>
              </label>
              <Input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-navy-900">No learners are linked to this course. It, its modules, lessons and quizzes will be deleted permanently.</p>
          )
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          {course.published ? (
            <Button variant="teal" size="sm" disabled={pending} onClick={() => run(() => setCoursePublished(course.id, false), false)}>
              <EyeOff className="size-4" aria-hidden /> Hide from site instead
            </Button>
          ) : null}
          <Button variant="danger" size="sm" disabled={pending || !impact || !titleOk} onClick={() => run(() => deleteCourse(course.id, typed), true)}>
            <Trash2 className="size-4" aria-hidden /> {pending ? "Working…" : "Delete permanently"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
