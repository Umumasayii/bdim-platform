"use client";

import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import type { Course } from "@/lib/types";
import { useLearner } from "@/lib/learner/provider";
import { ProgressBar } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LessonOutline({ course, currentLessonId }: { course: Course; currentLessonId: string }) {
  const { state } = useLearner();
  const all = course.modules.flatMap((m) => m.lessons);
  const done = all.filter((l) => state.lessonsCompleted[l.id]).length;
  return (
    <nav aria-label="Course outline" className="mt-4 rounded-2xl border border-line bg-white p-4">
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Progress</span>
          <span>
            {done}/{all.length}
          </span>
        </div>
        <ProgressBar value={(done / Math.max(1, all.length)) * 100} label="Course progress" />
      </div>
      <ol className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
        {course.modules.map((m, i) => (
          <li key={m.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {i + 1}. {m.title}
            </p>
            <ul className="mt-1.5 grid gap-0.5">
              {m.lessons.map((l) => {
                const current = l.id === currentLessonId;
                const complete = Boolean(state.lessonsCompleted[l.id]);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${course.slug}/${l.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm",
                        current ? "bg-teal-50 font-semibold text-navy-950" : "text-navy-800 hover:bg-surface",
                      )}
                    >
                      {complete ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-label="Completed" />
                      ) : current ? (
                        <PlayCircle className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-line" aria-hidden />
                      )}
                      <span>{l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  );
}
