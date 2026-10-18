import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, FileText, Lock, PlayCircle } from "lucide-react";
import { categories } from "@/content/categories";
import { getCourseBySlug, getPublishedCourses } from "@/lib/data/content";
import { getPublishedLibrary } from "@/lib/data/library";
import { courseLessonCount, courseMinutes } from "@/lib/data/sanitize";
import { Container, Eyebrow } from "@/components/ui/layout";
import { Badge, levelTone } from "@/components/ui/badge";
import { EnrollPanel } from "@/components/courses/enroll-panel";
import { InquiryForm } from "@/components/forms/inquiry-form";

const kigaliTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kigali" });

export async function generateStaticParams() {
  const courses = await getPublishedCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.summary,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: { title: course.title, description: course.summary },
  };
}

async function CoursePage({ params }: { params: PageProps<"/courses/[slug]">["params"] }) {
  const { slug } = await params;
  const [course, library] = await Promise.all([getCourseBySlug(slug), getPublishedLibrary()]);
  if (!course) notFound();
  const books = library.filter((i) => i.kind === "book" && i.courseId === course.id);
  const deliverables = course.modules.flatMap((m) => (m.assignment ? [m.assignment] : []));
  const category = categories.find((c) => c.id === course.category);
  const hours = Math.round(courseMinutes(course) / 60);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary,
    provider: { "@type": "Organization", name: "Big Data IQ Minds" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="border-b border-line bg-surface">
        <div className="bg-grid">
          <Container className="py-12 sm:py-16">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <Link href="/courses" className="hover:text-navy-900">
                Courses
              </Link>{" "}
              / <Link href={`/courses?category=${course.category}`} className="hover:text-navy-900">{category?.short}</Link>
            </nav>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={levelTone(course.level)}>{course.level}</Badge>
              {books.length ? (
                <Badge tone="green">
                  <BookOpen className="size-3.5" aria-hidden /> Course book available
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold text-navy-950 sm:text-5xl">{course.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{course.summary}</p>
            <p className="mt-4 text-sm text-muted">
              {course.modules.length} modules · {courseLessonCount(course)} lessons · about {hours} hours of guided content
            </p>
          </Container>
        </div>
      </section>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-12">
          <section>
            <h2 className="text-2xl font-bold text-navy-950">About this course</h2>
            <p className="mt-3 leading-relaxed text-navy-900">{course.description}</p>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold text-navy-950">What you&apos;ll achieve</h2>
              <ul className="mt-3 grid gap-2">
                {course.objectives.map((o) => (
                  <li key={o} className="flex gap-2 text-sm text-navy-900">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden /> {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid content-start gap-6">
              {deliverables.length || course.certificate.enabled ? (
                <div>
                  <h2 className="text-lg font-bold text-navy-950">What you&apos;ll deliver</h2>
                  <ul className="mt-3 grid gap-2">
                    {deliverables.map((d) => (
                      <li key={d.id} className="flex gap-2 text-sm text-navy-900">
                        <FileText className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                        <span>
                          {d.title}
                          {d.dueAt ? <span className="block text-xs text-muted">Due {kigaliTime(d.dueAt)} (Kigali time)</span> : null}
                        </span>
                      </li>
                    ))}
                    {course.certificate.enabled ? (
                      <li className="flex gap-2 text-sm text-navy-900">
                        <Award className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden /> Certificate of completion
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              <div>
                <h2 className="text-lg font-bold text-navy-950">Prerequisites</h2>
                <ul className="mt-2 grid gap-1 text-sm text-muted">
                  {course.prerequisites.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {books.length ? (
            <section className="rounded-2xl border border-leaf-200 bg-leaf-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-navy-950">
                <BookOpen className="size-5 text-leaf-600" aria-hidden /> Course {books.length === 1 ? "book" : "books"} available
              </h2>
              <ul className="mt-3 grid gap-2">
                {books.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-navy-900">{b.title}</span>
                    <span className="text-muted">{b.price > 0 ? `${b.price.toLocaleString("en-US")} ${b.currency}` : "Free"}</span>
                  </li>
                ))}
              </ul>
              <Link href="/library" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
                Get it from the library →
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="curriculum">
            <h2 id="curriculum" className="text-2xl font-bold text-navy-950">
              Curriculum
            </h2>
            <ol className="mt-5 grid gap-4">
              {course.modules.map((m, mi) => (
                <li key={m.id} className="rounded-2xl border border-line bg-white">
                  <details open={mi === 0} className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
                    <span>
                      <Eyebrow>Module {mi + 1}</Eyebrow>
                      <span className="mt-1 block font-bold text-navy-950">{m.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {m.summary} · {m.lessons.length} lessons{m.quiz ? " · quiz" : ""}{m.assignment ? " · assignment" : ""}
                      </span>
                    </span>
                    <ChevronDown className="mt-5 size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                        {l.isSample ? (
                          <PlayCircle className="size-4 shrink-0 text-teal-600" aria-hidden />
                        ) : (
                          <Lock className="size-4 shrink-0 text-muted" aria-label="Requires enrollment" />
                        )}
                        <span className="min-w-0 flex-1">
                          {l.isSample ? (
                            <Link href={`/learn/${course.slug}/${l.id}`} className="font-medium text-navy-900 hover:text-teal-700 hover:underline">
                              {l.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-navy-900">{l.title}</span>
                          )}
                          <span className="block text-xs text-muted">{l.summary}</span>
                        </span>
                        {l.isSample ? <Badge tone="teal">Free sample</Badge> : null}
                        <span className="shrink-0 text-xs text-muted">{l.durationMinutes} min</span>
                      </li>
                    ))}
                    {m.quiz ? (
                      <li className="flex items-center gap-3 px-5 py-3 text-sm text-navy-900">
                        <ClipboardCheck className="size-4 shrink-0 text-navy-500" aria-hidden />
                        <span className="flex-1">
                          Quiz: {m.quiz.title} <span className="text-xs text-muted">· {m.quiz.questions.length} questions · pass mark {m.quiz.passMark}%</span>
                        </span>
                      </li>
                    ) : null}
                    {m.assignment ? (
                      <li className="flex items-center gap-3 px-5 py-3 text-sm text-navy-900">
                        <FileText className="size-4 shrink-0 text-navy-500" aria-hidden />
                        <span className="flex-1">Assignment: {m.assignment.title}</span>
                      </li>
                    ) : null}
                  </ul>
                  </details>
                </li>
              ))}
            </ol>
          </section>

          {course.certificate.enabled ? (
            <section className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold text-navy-950">Certificate requirements</h2>
              <ul className="mt-3 grid gap-1.5 text-sm text-navy-900">
                {course.certificate.requireAllLessons ? <li>• Complete every lesson</li> : null}
                {course.modules.some((m) => m.quiz) ? <li>• Score at least {course.certificate.minQuizScore}% on every module quiz</li> : null}
                <li>• Hold an active enrollment</li>
              </ul>
              <p className="mt-3 text-xs text-muted">
                Certificates confirm completion of BDIM training. They are not an academic qualification or professional accreditation.
              </p>
            </section>
          ) : null}

          <section id="inquiry" aria-labelledby="inquiry-heading" className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 id="inquiry-heading" className="text-2xl font-bold text-navy-950">
              Request a quote
            </h2>
            <p className="mt-2 text-muted">
              Tell us whether you are an individual learner, a group or an organization, and your preferred format. Pricing is negotiable.
            </p>
            <div className="mt-6">
              <InquiryForm kind="course" courseSlug={course.slug} descriptionLabel="Your training needs" submitLabel="Request a quote" showParticipants />
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <EnrollPanel course={course} />
        </div>
      </Container>
    </>
  );
}

export default function Page({ params }: PageProps<"/courses/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CoursePage params={params} />
    </Suspense>
  );
}
