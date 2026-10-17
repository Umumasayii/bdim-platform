import Link from "next/link";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import { categories } from "@/content/categories";
import type { Course } from "@/lib/types";
import { Badge, levelTone } from "@/components/ui/badge";
import { courseLessonCount } from "@/lib/data/sanitize";
import { pricingLabel } from "./pricing";

export function CourseCard({ course }: { course: Course }) {
  const category = categories.find((c) => c.id === course.category);
  const sample = course.modules.flatMap((m) => m.lessons).find((l) => l.isSample);
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">{category?.short}</span>
        <Badge tone={levelTone(course.level)}>{course.level}</Badge>
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-navy-950">
        <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0">
          {course.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{course.summary}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Skills covered">
        {course.skills.slice(0, 3).map((s) => (
          <li key={s}>
            <Badge>{s}</Badge>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        <p className="text-xs text-muted">
          <span className="font-medium text-navy-800">Prerequisites:</span> {course.prerequisites[0] ?? "None"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Layers className="size-3.5" aria-hidden /> {course.modules.length} modules · {courseLessonCount(course)} lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {course.duration}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-navy-900">{pricingLabel(course.pricing)}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
            {sample ? "Free sample lesson" : "View course"}
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}
