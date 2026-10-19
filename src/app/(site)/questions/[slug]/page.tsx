import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCourses, getPublishedQuestions } from "@/lib/data/content";
import { Container } from "@/components/ui/layout";
import { QuestionPractice } from "@/components/practice/question-practice";
import { Discussion } from "@/components/practice/discussion";

export async function generateStaticParams() {
  return (await getPublishedQuestions()).map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: PageProps<"/questions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const q = (await getPublishedQuestions()).find((x) => x.slug === slug);
  return q ? { title: `${q.title} — ${q.topic} practice question`, description: `${q.difficulty} ${q.topic} practice question with hints and a worked solution.` } : { title: "Question" };
}

async function QuestionPage({ params }: { params: PageProps<"/questions/[slug]">["params"] }) {
  const { slug } = await params;
  const [questions, courses] = await Promise.all([getPublishedQuestions(), getPublishedCourses()]);
  const index = questions.findIndex((x) => x.slug === slug);
  const question = questions[index];
  if (!question) notFound();
  const related = question.relatedCourseSlugs
    .map((s) => courses.find((c) => c.slug === s))
    .filter((c) => c !== undefined)
    .map((c) => ({ slug: c.slug, title: c.title }));
  const sameTopic = questions.filter((x) => x.topic === question.topic && x.id !== question.id).slice(0, 4);

  return (
    <Container className="grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/questions" className="hover:text-navy-900">
            Question bank
          </Link>{" "}
          / {question.topic}
        </nav>
        <h1 className="text-3xl font-bold text-navy-950">{question.title}</h1>
        <QuestionPractice question={question} relatedCourses={related} />
        <Discussion questionId={question.id} />
      </div>
      <aside className="grid content-start gap-4">
        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold text-navy-950">More {question.topic} questions</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {sameTopic.map((x) => (
              <li key={x.id}>
                <Link href={`/questions/${x.slug}`} className="text-teal-700 hover:underline">
                  {x.title}
                </Link>
                <span className="text-xs text-muted"> · {x.difficulty}</span>
              </li>
            ))}
          </ul>
        </div>
        {related.length ? (
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-navy-950">Related courses</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {related.map((c) => (
                <li key={c.slug}>
                  <Link href={`/courses/${c.slug}`} className="text-teal-700 hover:underline">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </Container>
  );
}

export default function Page({ params }: PageProps<"/questions/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuestionPage params={params} />
    </Suspense>
  );
}
