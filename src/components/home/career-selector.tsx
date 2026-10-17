"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, FolderKanban, HelpCircle } from "lucide-react";
import type { CareerGoal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, levelTone } from "@/components/ui/badge";

export interface CourseLite {
  slug: string;
  title: string;
  level: string;
}

export function CareerSelector({
  goals,
  courses,
  questions,
}: {
  goals: CareerGoal[];
  courses: CourseLite[];
  questions: { slug: string; title: string; topic: string }[];
}) {
  const [selectedId, setSelectedId] = useState(goals[0]?.id);
  const goal = goals.find((g) => g.id === selectedId) ?? goals[0];
  const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
  const questionBySlug = new Map(questions.map((q) => [q.slug, q]));

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div role="radiogroup" aria-label="Choose your goal" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {goals.map((g) => (
          <button
            key={g.id}
            type="button"
            role="radio"
            aria-checked={g.id === goal.id}
            onClick={() => setSelectedId(g.id)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all",
              g.id === goal.id
                ? "border-teal-500 bg-teal-50 text-navy-950 shadow-sm"
                : "border-line bg-white text-navy-800 hover:border-navy-200 hover:bg-surface",
            )}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div key={goal.id} className="animate-rise rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Your roadmap · {goal.role}</p>
        <p className="mt-2 text-lg text-navy-900">{goal.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {goal.whatYouDo.map((w) => (
            <Badge key={w}>{w}</Badge>
          ))}
        </div>

        <ol className="mt-8 grid gap-4">
          {goal.stages.map((stage, i) => (
            <li key={stage.title} className="relative grid grid-cols-[2rem_1fr] gap-4">
              <span className="grid size-8 place-items-center rounded-full bg-navy-800 text-sm font-bold text-white">{i + 1}</span>
              <div className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-navy-950">{stage.title}</p>
                  <p className="text-xs font-medium text-muted">Indicative: {stage.duration}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{stage.focus}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {stage.courseSlugs.map((slug) => {
                    const c = courseBySlug.get(slug);
                    return c ? (
                      <li key={slug}>
                        <Link
                          href={`/courses/${slug}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-navy-900 hover:border-teal-400"
                        >
                          <BookOpen className="size-3.5 text-teal-600" aria-hidden />
                          {c.title}
                          <Badge tone={levelTone(c.level)} className="ml-1">
                            {c.level}
                          </Badge>
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
              <FolderKanban className="size-4 text-teal-600" aria-hidden /> Practical projects
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm text-muted">
              {goal.projects.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
              <HelpCircle className="size-4 text-teal-600" aria-hidden /> Practice questions
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {goal.questionSlugs.map((slug) => {
                const q = questionBySlug.get(slug);
                return q ? (
                  <li key={slug}>
                    <Link href={`/questions/${slug}`} className="text-teal-700 underline-offset-2 hover:underline">
                      {q.title}
                    </Link>{" "}
                    <span className="text-xs text-muted">· {q.topic}</span>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="max-w-md text-xs text-muted">
            Durations are indicative and depend on your starting point and weekly study time. Training builds skills; it cannot guarantee employment.
          </p>
          <Link href={`/learning-paths/${goal.pathSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
            View the full learning path <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
