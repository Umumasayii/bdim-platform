import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Code2, FlaskConical, GraduationCap, Sigma } from "lucide-react";
import { ecosystem } from "@/content/categories";
import { careerGoals } from "@/content/paths";
import { faqs } from "@/content/faqs";
import { projects } from "@/content/projects";
import { consultingServices } from "@/content/services";
import { labExercises } from "@/content/exercises";
import { getInstructors, getPublishedCourses, getPublishedPaths, getPublishedQuestions, getPublishedTestimonials } from "@/lib/data/content";
import { HOMEPAGE_FEATURED_COURSES, site } from "@/lib/site";
import { getCourseBooks } from "@/lib/data/library";
import { Container, Eyebrow, SectionHeading } from "@/components/ui/layout";
import { Collapsible } from "@/components/ui/collapsible";
import { ButtonLink } from "@/components/ui/button";
import { Badge, levelTone } from "@/components/ui/badge";
import { HeroDemo } from "@/components/home/hero-demo";
import { CareerSelector } from "@/components/home/career-selector";
import { ExploreGrid } from "@/components/home/explore-grid";
import { CourseCard } from "@/components/courses/course-card";
import { LessonsProgress } from "@/components/home/path-progress";
import { QuestionPractice } from "@/components/practice/question-practice";
import { InstructorCard } from "@/components/home/instructor-card";
import { Faq } from "@/components/home/faq";
import { EcosystemIcon } from "@/components/home/ecosystem-icon";

export default async function HomePage() {
  const [courses, paths, questions, instructors, testimonials, books] = await Promise.all([
    getPublishedCourses(),
    getPublishedPaths(),
    getPublishedQuestions(),
    getInstructors(),
    getPublishedTestimonials(),
    getCourseBooks(),
  ]);
  const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
  const featuredCourses = courses.filter((c) => c.featured).slice(0, HOMEPAGE_FEATURED_COURSES);
  const trackPaths = (["Beginner", "Intermediate", "Advanced"] as const)
    .map((level) => paths.find((p) => p.level === level))
    .filter((p) => p !== undefined);
  const previewQuestion = questions.find((q) => q.slug === "interpret-percentage-points") ?? questions[0];
  const previewExercise = labExercises.find((e) => e.id === "sql-revenue-by-region")!;

  return (
    <>
      {/* A. Hero */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
        <Container className="relative grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_minmax(0,1fr)] lg:py-24">
          <div>
            <Eyebrow>{site.slogan}</Eyebrow>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] text-navy-950 sm:text-5xl lg:text-6xl">
              Turn Data Skills Into <span className="text-teal-600">Real-World Impact.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Learn data analytics, statistics, programming, artificial intelligence, and business intelligence through practical training
              designed to turn knowledge into results.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/courses" size="lg">
                Explore Courses <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/practice" size="lg" variant="outline">
                Start Practicing
              </ButtonLink>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 text-sm text-navy-800">
              {[
                `${courses.length} practical courses`,
                "Free practice questions",
                "Python, SQL & R in your browser",
                "Training for organizations",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-leaf-500" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroDemo />
        </Container>
      </section>

      {/* B–E. Explore: career roadmaps, ecosystem, learning paths, practice preview */}
      <section className="border-y border-line bg-surface py-14" aria-label="Explore Big Data IQ Minds">
        <Container>
          <ExploreGrid
            items={[
              {
                id: "career-paths",
                icon: "compass",
                eyebrow: "Choose your direction",
                title: "Where do you want your data skills to take you?",
                description: "Pick a goal to see a tailored roadmap: the stages, courses, projects and practice questions that build the skills for that role.",
                content: (
                      <CareerSelector
                      goals={careerGoals}
                      courses={courses.map((c) => ({ slug: c.slug, title: c.title, level: c.level }))}
                      questions={questions.map((q) => ({ slug: q.slug, title: q.title, topic: q.topic }))}
                    />
                ),
              },
              {
                id: "ecosystem",
                icon: "network",
                eyebrow: "Explore our learning ecosystem",
                title: "Eight connected areas of practice",
                description: "Skills that work together on real problems — from collecting data in the field to presenting decisions to leadership.",
                content: (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {ecosystem.map((e) => (
                        <li key={e.title}>
                          <Link
                            href={e.href}
                            className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-lift)]"
                          >
                            <span className="grid size-10 place-items-center rounded-xl bg-navy-800 text-teal-200 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                              <EcosystemIcon name={e.icon} className="size-5" />
                            </span>
                            <span className="mt-4 font-bold text-navy-950">{e.title}</span>
                            <span className="mt-1.5 text-sm leading-relaxed text-muted">{e.text}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                ),
              },
              {
                id: "learning-tracks",
                icon: "route",
                eyebrow: "Featured learning paths",
                title: "Structured tracks from first steps to advanced practice",
                description: "Beginner, intermediate and advanced tracks with prerequisites, modules, objectives and practical assignments.",
                content: (
                  <>
                      <div className="grid gap-6 lg:grid-cols-3">
                        {trackPaths.map((p) => {
                          const pathCourses = p.courseSlugs.map((s) => courseBySlug.get(s)).filter((c) => c !== undefined);
                          const lessonIds = pathCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
                          return (
                            <article key={p.id} className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
                              <Badge tone={levelTone(p.level)} className="self-start">
                                {p.level} track
                              </Badge>
                              <h3 className="mt-3 text-xl font-bold text-navy-950">{p.title}</h3>
                              <p className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</p>
                              <dl className="mt-5 grid gap-4 text-sm">
                                <div>
                                  <dt className="font-semibold text-navy-950">Prerequisites</dt>
                                  <dd className="mt-1 text-muted">{p.prerequisites.join("; ")}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-navy-950">Modules</dt>
                                  <dd className="mt-1">
                                    <ol className="grid gap-1 text-muted">
                                      {pathCourses.map((c, i) => (
                                        <li key={c.slug}>
                                          {i + 1}. {c.title}
                                        </li>
                                      ))}
                                    </ol>
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-navy-950">You will be able to</dt>
                                  <dd className="mt-1 text-muted">{p.objectives[0]}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-navy-950">Practical assignment</dt>
                                  <dd className="mt-1 text-muted">{p.assignments[0]}</dd>
                                </div>
                              </dl>
                              <div className="mt-auto pt-6">
                                <LessonsProgress lessonIds={lessonIds} label={`${p.title} progress`} />
                                <Link href={`/learning-paths/${p.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                                  View path <ArrowRight className="size-4" aria-hidden />
                                </Link>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      <div className="mt-8">
                        <ButtonLink href="/learning-paths" variant="outline">
                          All learning paths
                        </ButtonLink>
                      </div>
                  </>
                ),
              },
              {
                id: "practice-preview",
                icon: "code",
                dark: true,
                eyebrow: "Practice preview",
                title: "Learn by doing, with feedback straight away",
                description: "Answer a sample question, then try a real coding exercise. Explanations show the reasoning, not just the answer.",
                content: (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_minmax(0,1fr)]">
                      <div className="text-ink">
                        <QuestionPractice question={previewQuestion} compact />
                      </div>
                      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                        <p className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                          <Code2 className="size-4" aria-hidden /> Short coding exercise · SQL
                        </p>
                        <h3 className="mt-2 text-xl font-bold">{previewExercise.title}</h3>
                        <p className="mt-2 text-sm text-navy-200">
                          Using the <code className="rounded bg-white/10 px-1 font-mono">sales</code> table, return each region with its total revenue,
                          highest first.
                        </p>
                        <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-teal-100">
                          <code>{previewExercise.starterCode.trim()}</code>
                        </pre>
                        <p className="mt-4 text-xs text-navy-300">Runs on a real SQLite database inside your browser — nothing is executed on our servers.</p>
                        <div className="mt-auto flex flex-wrap gap-3 pt-6">
                          <ButtonLink href={`/coding-lab?exercise=${previewExercise.id}`} variant="teal">
                            Open in the Coding Lab
                          </ButtonLink>
                          <ButtonLink href="/practice" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                            Full practice zone
                          </ButtonLink>
                        </div>
                      </div>
                    </div>
                ),
              },
            ]}
          />
        </Container>
      </section>

      {/* F. Featured courses */}
      <section className="py-20" aria-labelledby="courses-heading">
        <Container>
          <SectionHeading
            eyebrow="Featured courses"
            title={<span id="courses-heading">Practical courses, taught with real-world examples</span>}
            description="Every course includes modules, exercises and assessments. Pricing is flexible — request a quote for individual, group or corporate training."
            action={<ButtonLink href="/courses">Browse all {courses.length} courses</ButtonLink>}
          />
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} books={books[c.id]} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* G. Projects */}
      <section className="border-y border-line bg-surface py-14" aria-label="Practical projects">
        <Container>
          <Collapsible
            id="projects"
            eyebrow="Practical projects"
            title="Projects that mirror real analytical work"
            description="Demonstration projects built on synthetic data show the methods learners practise. They are labelled as examples."
          >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projects.slice(0, 4).map((p) => (
              <li key={p.slug}>
                <Link href={`/projects/${p.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">{p.domain}</span>
                    {p.isExample ? <Badge tone="amber">Example</Badge> : null}
                  </div>
                  <span className="mt-3 font-bold text-navy-950">{p.title}</span>
                  <span className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</span>
                  <span className="mt-auto pt-4 text-xs text-muted">{p.tools.join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href="/projects" variant="outline">
              View project portfolio
            </ButtonLink>
          </div>
          </Collapsible>
        </Container>
      </section>

      {/* H. Instructor */}
      {instructors.length ? (
        <section className="py-14" aria-label="Instructor">
          <Container>
            <Collapsible id="instructor" eyebrow="Learn with" title="Your instructor" description={`Meet ${instructors.map((i) => i.name).join(", ")}.`}>
            <div className="grid gap-6">
              {instructors.map((i) => (
                <InstructorCard key={i.id} profile={i} />
              ))}
            </div>
            </Collapsible>
          </Container>
        </section>
      ) : null}

      {/* I. Corporate & consulting */}
      <section className="border-y border-line bg-gradient-to-br from-navy-900 to-navy-800 py-14 text-white" aria-label="For organizations">
        <Container>
          <Collapsible
            id="organizations"
            tone="dark"
            eyebrow="For organizations"
            title="Training and analytics support for your team"
            description="Universities, NGOs, government institutions, research teams and companies can request customised training or practical analytics support — from survey design to dashboards and predictive models."
          >
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
          <div>
            <ol className="grid gap-4">
              {[
                ["Tell us what you need", "Share your goals, team size, timeline and tools."],
                ["Scoping conversation", "We agree objectives, format and deliverables."],
                ["Proposal and quote", "A tailored plan with negotiable pricing."],
                ["Delivery and follow-up", "Training or analysis, with handover support."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-500 text-sm font-bold text-navy-950">{i + 1}</span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-sm text-navy-200">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/corporate-training" variant="teal">
                <Building2 className="size-4" aria-hidden /> Request organizational training
              </ButtonLink>
              <ButtonLink href="/consulting" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                Consulting services
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {consultingServices.map((s) => (
              <li key={s.slug}>
                <Link href={`/consulting/${s.slug}`} className="block h-full rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]">
                  <span className="font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm text-navy-200">{s.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
          </div>
          </Collapsible>
        </Container>
      </section>

      {/* J. Testimonials (only verified, published ones) */}
      {testimonials.length ? (
        <section className="py-20" aria-labelledby="testimonials-heading">
          <Container>
            <SectionHeading eyebrow="Learner voices" title={<span id="testimonials-heading">What learners and partners say</span>} />
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <li key={t.id}>
                  <figure className="h-full rounded-2xl border border-line bg-white p-6">
                    <blockquote className="leading-relaxed text-navy-900">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 text-sm">
                      <span className="font-semibold text-navy-950">{t.name}</span>
                      <span className="text-muted">{[t.role, t.organization].filter(Boolean).length ? ` · ${[t.role, t.organization].filter(Boolean).join(", ")}` : ""}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="py-20" aria-labelledby="faq-heading">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_1.6fr]">
          <div>
            <Eyebrow>FAQ</Eyebrow>
            <h2 id="faq-heading" className="mt-2 text-3xl font-bold text-navy-950 sm:text-4xl">
              Questions, answered
            </h2>
            <p className="mt-3 text-muted">
              Can&apos;t find what you need?{" "}
              <Link href="/contact" className="font-semibold text-teal-700 hover:underline">
                Contact us
              </Link>
              .
            </p>
          </div>
          <Faq items={faqs} />
        </Container>
      </section>

      {/* Final CTA */}
      <section className="pb-20">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-leaf-600 px-6 py-14 text-white sm:px-12">
            <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_minmax(0,1fr)] lg:items-center">
              <div>
                <h2 className="text-3xl font-bold sm:text-4xl">{site.tagline}</h2>
                <p className="mt-3 max-w-xl text-lg text-teal-50">Start with free practice today, or talk to us about training for yourself or your organization.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <ButtonLink href="/practice" className="bg-white text-navy-900 hover:bg-teal-50">
                  <FlaskConical className="size-4" aria-hidden /> Start practicing free
                </ButtonLink>
                <ButtonLink href="/courses" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                  <GraduationCap className="size-4" aria-hidden /> Explore courses
                </ButtonLink>
              </div>
            </div>
            <Sigma className="absolute -right-6 -top-6 size-48 text-white/10" aria-hidden />
          </div>
        </Container>
      </section>
    </>
  );
}
