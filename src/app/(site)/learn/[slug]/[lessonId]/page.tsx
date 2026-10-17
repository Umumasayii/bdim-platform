import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCourseBySlug } from "@/lib/data/content";
import { getLessonContent } from "@/lib/data/lessons";
import { Container } from "@/components/ui/layout";
import { LessonView } from "@/components/learner/lesson-view";
import { LessonOutline } from "@/components/learner/lesson-outline";
import type { Course } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/learn/[slug]/[lessonId]">): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  return { title: lesson ? `${lesson.title} — ${course!.title}` : "Lesson", robots: { index: Boolean(lesson?.isSample) } };
}

async function LessonBody({ course, lessonId }: { course: Course; lessonId: string }) {
  const content = await getLessonContent(course.slug, lessonId);
  return <LessonView course={course} lessonId={lessonId} content={content} />;
}

async function LessonPage({ params }: { params: PageProps<"/learn/[slug]/[lessonId]">["params"] }) {
  const { slug, lessonId } = await params;
  const course = await getCourseBySlug(slug);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  if (!course || !lesson) notFound();
  return (
    <Container className="grid gap-8 py-8 lg:grid-cols-[18rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Link href={`/courses/${course.slug}`} className="text-sm font-medium text-teal-700 hover:underline">
          ← {course.title}
        </Link>
        <LessonOutline course={course} currentLessonId={lessonId} />
      </aside>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
        <LessonBody course={course} lessonId={lessonId} />
      </Suspense>
    </Container>
  );
}

export default function Page({ params }: PageProps<"/learn/[slug]/[lessonId]">) {
  return (
    <Suspense fallback={<Container className="py-8"><div className="h-96 animate-pulse rounded-2xl bg-surface-2" /></Container>}>
      <LessonPage params={params} />
    </Suspense>
  );
}
