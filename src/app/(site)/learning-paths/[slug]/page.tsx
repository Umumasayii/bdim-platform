import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { getPublishedCourses, getPublishedPaths } from "@/lib/data/content";
import { Container, PageHeader } from "@/components/ui/layout";
import { Badge, levelTone } from "@/components/ui/badge";
import { CourseCard } from "@/components/courses/course-card";
import { LessonsProgress } from "@/components/home/path-progress";
import { ButtonLink } from "@/components/ui/button";

export async function generateStaticParams() {
  return (await getPublishedPaths()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learning-paths/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = (await getPublishedPaths()).find((p) => p.slug === slug);
  return path ? { title: path.title, description: path.summary, alternates: { canonical: `/learning-paths/${slug}` } } : { title: "Learning path" };
}

async function PathPage({ params }: { params: PageProps<"/learning-paths/[slug]">["params"] }) {
  const { slug } = await params;
  const [paths, courses] = await Promise.all([getPublishedPaths(), getPublishedCourses()]);
  const path = paths.find((p) => p.slug === slug);
  if (!path) notFound();
  const list = path.courseSlugs.map((s) => courses.find((c) => c.slug === s)).filter((c) => c !== undefined);
  const lessonIds = list.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));

  return (
    <>
      <PageHeader eyebrow={`${path.level} learning path`} title={path.title} description={path.summary}>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={levelTone(path.level)}>{path.level}</Badge>
          <span className="text-sm text-muted">{path.estimatedDuration} · {list.length} courses</span>
        </div>
      </PageHeader>
      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Courses in this path</h2>
          <p className="mt-1 text-muted">Take them in order, or skip those you already know.</p>
          <ol className="mt-6 grid gap-6 md:grid-cols-2">
            {list.map((c, i) => (
              <li key={c.slug} className="relative">
                <span className="absolute -left-2 -top-2 z-10 grid size-7 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">{i + 1}</span>
                <CourseCard course={c} />
              </li>
            ))}
          </ol>
        </div>
        <aside className="grid content-start gap-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <LessonsProgress lessonIds={lessonIds} label="Path progress" />
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-navy-950">Who it&apos;s for</h2>
            <p className="mt-1 text-sm text-muted">{path.audience}</p>
            <h2 className="mt-5 font-semibold text-navy-950">Prerequisites</h2>
            <ul className="mt-1 grid gap-1 text-sm text-muted">
              {path.prerequisites.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
            <h2 className="mt-5 font-semibold text-navy-950">Objectives</h2>
            <ul className="mt-2 grid gap-2 text-sm">
              {path.objectives.map((o) => (
                <li key={o} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden /> {o}
                </li>
              ))}
            </ul>
            <h2 className="mt-5 font-semibold text-navy-950">Practical assignments</h2>
            <ul className="mt-2 grid gap-2 text-sm">
              {path.assignments.map((a) => (
                <li key={a} className="flex gap-2">
                  <ClipboardList className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden /> {a}
                </li>
              ))}
            </ul>
          </div>
          <ButtonLink href="/contact?topic=learning-path" variant="outline">
            Ask about this path
          </ButtonLink>
        </aside>
      </Container>
    </>
  );
}

export default function Page({ params }: PageProps<"/learning-paths/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PathPage params={params} />
    </Suspense>
  );
}
