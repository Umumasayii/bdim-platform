import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Database, FileSpreadsheet, LineChart } from "lucide-react";
import { formulaExercises, labExercises } from "@/content/exercises";
import { getPublishedCourses, getPublishedQuestions } from "@/lib/data/content";
import { Container, PageHeader, SectionHeading } from "@/components/ui/layout";
import { Badge, levelTone } from "@/components/ui/badge";
import { FormulaLab } from "@/components/practice/formula-lab";
import { KpiChallenge } from "@/components/practice/kpi-challenge";
import { PracticeStats } from "@/components/practice/practice-stats";

export const metadata: Metadata = {
  title: "Free Practice Zone",
  description: "Free sample questions, Excel challenges, SQL and Python exercises, a KPI interpretation challenge and introductory lessons.",
  alternates: { canonical: "/practice" },
};

export default async function PracticePage() {
  const [questions, courses] = await Promise.all([getPublishedQuestions(), getPublishedCourses()]);
  const free = questions.filter((q) => q.free);
  const topics = [...new Set(free.map((q) => q.topic))];
  const sampleLessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.filter((l) => l.isSample).map((l) => ({ course: c, lesson: l }))));
  const freeLab = labExercises.filter((e) => e.free);

  return (
    <>
      <PageHeader
        eyebrow="Free practice zone"
        title="Practise before you enrol — no account needed"
        description="Sample questions, Excel challenges, SQL and Python exercises, a KPI interpretation challenge and free introductory lessons."
      >
        <nav aria-label="Practice sections" className="flex flex-wrap gap-2">
          {[
            ["#questions", "Questions"],
            ["#excel", "Excel challenges"],
            ["#code", "SQL, Python & R"],
            ["#kpi", "KPI report"],
            ["#lessons", "Intro lessons"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-navy-900 hover:border-teal-400">
              {label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <Container className="grid gap-20 py-14">
        <PracticeStats totalFree={free.length} />

        <section id="questions" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Sample questions"
            title={`${free.length} free questions across ${topics.length} topics`}
            action={
              <Link href="/questions" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                Open the question bank <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => {
              const list = free.filter((q) => q.topic === t);
              return (
                <li key={t} className="rounded-2xl border border-line bg-white p-5">
                  <p className="font-bold text-navy-950">{t}</p>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {list.slice(0, 4).map((q) => (
                      <li key={q.id} className="flex items-center justify-between gap-2">
                        <Link href={`/questions/${q.slug}`} className="min-w-0 truncate text-teal-700 hover:underline">
                          {q.title}
                        </Link>
                        <Badge tone={levelTone(q.difficulty)}>{q.difficulty}</Badge>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="excel" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Excel challenges"
            title={
              <span className="inline-flex items-center gap-3">
                <FileSpreadsheet className="size-8 text-leaf-600" aria-hidden /> Formula practice on a live worksheet
              </span>
            }
            description="Type a formula and it is evaluated against the sheet — just like in Excel."
          />
          <FormulaLab exercises={formulaExercises} />
        </section>

        <section id="code" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Coding exercises"
            title="SQL, Python and R in your browser"
            action={
              <Link href="/coding-lab" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
                Open the Coding Lab <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freeLab.map((e) => (
              <li key={e.id}>
                <Link href={`/coding-lab?exercise=${e.id}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-600">
                    {e.language === "sql" ? <Database className="size-4" aria-hidden /> : <Code2 className="size-4" aria-hidden />}
                    {e.language === "sql" ? "SQL" : e.language === "r" ? "R" : "Python"}
                  </span>
                  <span className="mt-2 font-bold text-navy-950">{e.title}</span>
                  <span className="mt-1 line-clamp-2 text-sm text-muted">{e.instructions.replace(/[*`]/g, "")}</span>
                  <span className="mt-auto pt-4">
                    <Badge tone={levelTone(e.level)}>{e.level}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="kpi" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Interpret a report"
            title={
              <span className="inline-flex items-center gap-3">
                <LineChart className="size-8 text-teal-600" aria-hidden /> Read a Power BI-style KPI report
              </span>
            }
            description="Dashboards only help if you can interpret them. Study the report, then answer three questions."
          />
          <KpiChallenge />
        </section>

        <section id="lessons" className="scroll-mt-24">
          <SectionHeading eyebrow="Free introductory lessons" title="Sample lessons from our courses" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sampleLessons.map(({ course, lesson }) => (
              <li key={lesson.id}>
                <Link href={`/learn/${course.slug}/${lesson.id}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
                  <span className="flex items-center gap-2 text-xs font-semibold text-teal-600">
                    <BookOpen className="size-4" aria-hidden /> {course.title}
                  </span>
                  <span className="mt-2 font-bold text-navy-950">{lesson.title}</span>
                  <span className="mt-1 text-sm text-muted">{lesson.summary}</span>
                  <span className="mt-auto pt-3 text-xs text-muted">{lesson.durationMinutes} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
