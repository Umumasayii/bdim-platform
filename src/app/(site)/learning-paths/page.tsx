import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { careerGoals } from "@/content/paths";
import { getPublishedCourses, getPublishedPaths, getPublishedQuestions } from "@/lib/data/content";
import { Container, PageHeader, SectionHeading } from "@/components/ui/layout";
import { Badge, levelTone } from "@/components/ui/badge";
import { CareerSelector } from "@/components/home/career-selector";
import { LessonsProgress } from "@/components/home/path-progress";

export const metadata: Metadata = {
  title: "Learning Paths",
  description: "Structured beginner, intermediate and advanced learning paths for data analysis, statistics, survey systems, BI, GIS and machine learning.",
  alternates: { canonical: "/learning-paths" },
};

export default async function LearningPathsPage() {
  const [paths, courses, questions] = await Promise.all([getPublishedPaths(), getPublishedCourses(), getPublishedQuestions()]);
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  return (
    <>
      <PageHeader
        eyebrow="Learning paths"
        title="A clear sequence from where you are to where you want to be"
        description="Each path groups courses in a recommended order, with prerequisites, objectives and practical assignments. Progress updates as you complete lessons."
      />
      <Container className="py-14">
        <ul className="grid gap-6 lg:grid-cols-2">
          {paths.map((p) => {
            const list = p.courseSlugs.map((s) => bySlug.get(s)).filter((c) => c !== undefined);
            return (
              <li key={p.id}>
                <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={levelTone(p.level)}>{p.level}</Badge>
                    <span className="text-xs text-muted">{p.estimatedDuration}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-navy-950">
                    <Link href={`/learning-paths/${p.slug}`} className="hover:text-teal-700">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-muted">{p.summary}</p>
                  <ol className="mt-4 flex flex-wrap gap-2">
                    {list.map((c, i) => (
                      <li key={c.slug}>
                        <Badge>
                          {i + 1}. {c.title}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-auto pt-6">
                    <LessonsProgress lessonIds={list.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)))} label={`${p.title} progress`} />
                    <Link href={`/learning-paths/${p.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                      View path <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <section className="mt-20">
          <SectionHeading eyebrow="Not sure where to start?" title="Choose a career goal" description="See a roadmap with stages, courses, projects and practice questions." />
          <CareerSelector
            goals={careerGoals}
            courses={courses.map((c) => ({ slug: c.slug, title: c.title, level: c.level }))}
            questions={questions.map((q) => ({ slug: q.slug, title: q.title, topic: q.topic }))}
          />
        </section>
      </Container>
    </>
  );
}
