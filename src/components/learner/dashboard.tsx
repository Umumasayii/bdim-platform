"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BookOpen, Bookmark, Flame, FolderKanban, NotebookPen, Target, Trash2, UserRound } from "lucide-react";
import type { Course, Question } from "@/lib/types";
import { useLearner } from "@/lib/learner/provider";
import { computeStreak } from "@/lib/learner/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/card";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/layout";
import { Notice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

type Tab = "overview" | "courses" | "practice" | "notes" | "portfolio" | "certificates" | "profile";

const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "overview", label: "Overview", icon: Target },
  { id: "courses", label: "My courses", icon: BookOpen },
  { id: "practice", label: "Practice history", icon: Flame },
  { id: "notes", label: "Notes & bookmarks", icon: NotebookPen },
  { id: "portfolio", label: "Portfolio", icon: FolderKanban },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "profile", label: "Profile", icon: UserRound },
];

export function LearnerDashboard({ courses, questions }: { courses: Course[]; questions: Question[] }) {
  const learner = useLearner();
  const { ready, mode, state } = learner;
  const [tab, setTab] = useState<Tab>("overview");

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;
  if (mode === "guest") {
    return (
      <EmptyState title="Sign in to see your learning dashboard" action={<ButtonLink href="/sign-in?next=/dashboard" variant="teal">Sign in</ButtonLink>}>
        Your enrollments, progress, notes and certificates are stored with your account.
      </EmptyState>
    );
  }

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const enrolled = Object.entries(state.enrollments)
    .map(([id, e]) => ({ course: courseById.get(id), ...e }))
    .filter((e) => e.course);
  const progressOf = (c: Course) => {
    const ids = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const done = ids.filter((id) => state.lessonsCompleted[id]).length;
    const nextId = ids.find((id) => !state.lessonsCompleted[id]) ?? ids[0];
    return { done, total: ids.length, pct: ids.length ? (done / ids.length) * 100 : 0, nextId };
  };
  const streak = computeStreak(state);
  const attempts = state.attempts;
  const correct = attempts.filter((a) => a.correct).length;
  const last = state.lastLesson;
  const lastCourse = last ? courses.find((c) => c.id === last.courseId) : undefined;
  const lastLesson = lastCourse?.modules.flatMap((m) => m.lessons).find((l) => l.id === last?.lessonId);

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Dashboard sections" className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium",
                  tab === t.id ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-surface",
                )}
              >
                <t.icon className="size-4" aria-hidden /> {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        {mode === "demo" ? (
          <Notice tone="warning" className="mb-6" title="Demo mode">
            Accounts are not configured, so this dashboard shows data stored in this browser only. Certificates issued here are demonstrations.
          </Notice>
        ) : null}

        {tab === "overview" ? (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: "Courses", value: enrolled.length },
                { label: "Lessons completed", value: Object.keys(state.lessonsCompleted).length },
                { label: "Practice accuracy", value: attempts.length ? `${Math.round((correct / attempts.length) * 100)}%` : "—" },
                { label: "Learning streak", value: `${streak} day${streak === 1 ? "" : "s"}` },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-navy-950">{s.value}</p>
                </div>
              ))}
            </div>
            {lastCourse && lastLesson ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Resume where you left off</p>
                  <p className="mt-1 font-bold text-navy-950">{lastLesson.title}</p>
                  <p className="text-sm text-muted">{lastCourse.title}</p>
                </div>
                <ButtonLink href={`/learn/${lastCourse.slug}/${lastLesson.id}`} variant="teal">
                  Resume lesson
                </ButtonLink>
              </div>
            ) : null}
            {!enrolled.length ? (
              <EmptyState title="You haven't enrolled in a course yet" action={<ButtonLink href="/courses" variant="teal">Browse courses</ButtonLink>}>
                Start with a free sample lesson or the practice zone.
              </EmptyState>
            ) : (
              <CoursesList enrolled={enrolled} progressOf={progressOf} />
            )}
          </div>
        ) : null}

        {tab === "courses" ? (
          enrolled.length ? (
            <CoursesList enrolled={enrolled} progressOf={progressOf} />
          ) : (
            <EmptyState title="No courses yet" action={<ButtonLink href="/courses">Browse courses</ButtonLink>} />
          )
        ) : null}

        {tab === "practice" ? (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Attempts" value={attempts.length} />
              <Stat label="Correct" value={correct} />
              <Stat label="Saved questions" value={Object.keys(state.saved).length} />
            </div>
            {Object.keys(state.saved).length ? (
              <section className="rounded-2xl border border-line bg-white p-5">
                <h2 className="font-bold text-navy-950">My collection</h2>
                <ul className="mt-3 grid gap-2 text-sm">
                  {Object.keys(state.saved).map((id) => {
                    const q = questionById.get(id);
                    return q ? (
                      <li key={id} className="flex items-center justify-between gap-2">
                        <Link href={`/questions/${q.slug}`} className="text-teal-700 hover:underline">
                          {q.title}
                        </Link>
                        {state.completed[id] ? <Badge tone="green">Completed</Badge> : <Badge>{q.topic}</Badge>}
                      </li>
                    ) : null;
                  })}
                </ul>
              </section>
            ) : null}
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-bold text-navy-950">Recent attempts</h2>
              {attempts.length ? (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {attempts.slice(0, 30).map((a, i) => {
                    const q = questionById.get(a.questionId);
                    return (
                      <li key={`${a.at}-${i}`} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate">{q ? <Link href={`/questions/${q.slug}`} className="hover:underline">{q.title}</Link> : a.questionId}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={a.correct ? "green" : "amber"}>{a.correct ? "Correct" : "Incorrect"}</Badge>
                          <span className="text-xs text-muted">{formatDate(a.at)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  No attempts yet. <Link href="/practice" className="font-medium text-teal-700 underline">Start practising</Link>.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="grid gap-6">
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="flex items-center gap-2 font-bold text-navy-950">
                <Bookmark className="size-4 text-teal-600" aria-hidden /> Bookmarked lessons
              </h2>
              <LessonLinks ids={Object.keys(state.bookmarks)} courses={courses} empty="No bookmarks yet." />
            </section>
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="flex items-center gap-2 font-bold text-navy-950">
                <NotebookPen className="size-4 text-teal-600" aria-hidden /> Notes
              </h2>
              {Object.entries(state.notes).filter(([, n]) => n.body.trim()).length ? (
                <ul className="mt-3 grid gap-3">
                  {Object.entries(state.notes)
                    .filter(([, n]) => n.body.trim())
                    .map(([lessonId, n]) => {
                      const c = courseById.get(n.courseId);
                      const l = c?.modules.flatMap((m) => m.lessons).find((x) => x.id === lessonId);
                      return (
                        <li key={lessonId} className="rounded-xl bg-surface p-4">
                          {c && l ? (
                            <Link href={`/learn/${c.slug}/${l.id}`} className="text-sm font-semibold text-navy-950 hover:underline">
                              {l.title} <span className="font-normal text-muted">· {c.title}</span>
                            </Link>
                          ) : null}
                          <p className="mt-1 whitespace-pre-wrap text-sm text-navy-900">{n.body}</p>
                          <p className="mt-1 text-xs text-muted">Updated {formatDate(n.updatedAt)}</p>
                        </li>
                      );
                    })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">Notes you write on lesson pages appear here.</p>
              )}
            </section>
          </div>
        ) : null}

        {tab === "portfolio" ? <Portfolio courses={courses} /> : null}

        {tab === "certificates" ? (
          state.certificates.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {state.certificates.map((c) => (
                <li key={c.id} className="rounded-2xl border border-line bg-white p-5">
                  <Award className="size-6 text-teal-600" aria-hidden />
                  <p className="mt-2 font-bold text-navy-950">{c.courseTitle}</p>
                  <p className="text-sm text-muted">
                    Issued {formatDate(c.issuedAt)} · {c.number}
                  </p>
                  {c.demo ? <Badge tone="amber" className="mt-2">Demonstration only</Badge> : null}
                  <div className="mt-4">
                    <ButtonLink href={`/dashboard/certificates/${c.id}`} size="sm" variant="outline">
                      View certificate
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No certificates yet">
              Certificates are issued when you complete every lesson and pass the module quizzes of a course. Claim them from the course page.
            </EmptyState>
          )
        ) : null}

        {tab === "profile" ? <ProfileForm /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-950">{value}</p>
    </div>
  );
}

function CoursesList({
  enrolled,
  progressOf,
}: {
  enrolled: { course?: Course; status: string }[];
  progressOf: (c: Course) => { done: number; total: number; pct: number; nextId?: string };
}) {
  return (
    <ul className="grid gap-4">
      {enrolled.map(({ course, status }) => {
        if (!course) return null;
        const p = progressOf(course);
        const next = p.nextId ? { id: p.nextId } : null;
        return (
          <li key={course.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/courses/${course.slug}`} className="font-bold text-navy-950 hover:underline">
                  {course.title}
                </Link>
                <p className="text-xs text-muted">
                  {p.done}/{p.total} lessons · {status === "requested" ? "Enrollment requested" : status === "completed" ? "Completed" : "Active"}
                </p>
              </div>
              {status === "requested" ? (
                <Badge tone="amber">Awaiting confirmation</Badge>
              ) : next ? (
                <ButtonLink href={`/learn/${course.slug}/${next.id}`} size="sm" variant="outline">
                  {p.done ? "Continue" : "Start"}
                </ButtonLink>
              ) : null}
            </div>
            <ProgressBar value={p.pct} label={`${course.title} progress`} className="mt-4" />
          </li>
        );
      })}
    </ul>
  );
}

function LessonLinks({ ids, courses, empty }: { ids: string[]; courses: Course[]; empty: string }) {
  const items = ids
    .map((id) => {
      const c = courses.find((x) => x.modules.some((m) => m.lessons.some((l) => l.id === id)));
      const l = c?.modules.flatMap((m) => m.lessons).find((x) => x.id === id);
      return c && l ? { c, l } : null;
    })
    .filter((x) => x !== null);
  if (!items.length) return <p className="mt-2 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-3 grid gap-2 text-sm">
      {items.map(({ c, l }) => (
        <li key={l.id}>
          <Link href={`/learn/${c.slug}/${l.id}`} className="text-teal-700 hover:underline">
            {l.title}
          </Link>{" "}
          <span className="text-xs text-muted">· {c.title}</span>
        </li>
      ))}
    </ul>
  );
}

function Portfolio({ courses }: { courses: Course[] }) {
  const { state, addPortfolioItem, removePortfolioItem } = useLearner();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <form
        className="grid gap-4 rounded-2xl border border-line bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return setError("Give your project a title.");
          if (url && !/^https?:\/\//.test(url)) return setError("Links must start with http:// or https://");
          setError(null);
          if (await addPortfolioItem({ title: title.trim(), description: description.trim(), url: url.trim(), courseId: courseId || undefined })) {
            setTitle("");
            setDescription("");
            setUrl("");
            setCourseId("");
          }
        }}
      >
        <h2 className="font-bold text-navy-950">Add a project or achievement</h2>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="pf-title" required>
            <Input id="pf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Related course (optional)" htmlFor="pf-course">
            <Select id="pf-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">None</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="What did you do and find?" htmlFor="pf-desc">
          <Textarea id="pf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Link (GitHub, dashboard, report…)" htmlFor="pf-url">
          <Input id="pf-url" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <div>
          <Button type="submit" variant="teal">
            Add to portfolio
          </Button>
        </div>
      </form>
      {state.portfolio.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.portfolio.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-navy-950">{p.title}</p>
                <button type="button" aria-label={`Remove ${p.title}`} onClick={() => void removePortfolioItem(p.id)} className="text-muted hover:text-red-600">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {p.description ? <p className="mt-1 text-sm text-muted">{p.description}</p> : null}
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-teal-700 underline">
                  View project
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Your portfolio is empty">Document projects from assignments and the Coding Lab to show what you can do.</EmptyState>
      )}
    </div>
  );
}

function ProfileForm() {
  const { state, updateProfile, user, mode } = useLearner();
  const [profile, setProfile] = useState(state.profile);
  const [status, setStatus] = useState<string | null>(null);
  return (
    <form
      className="grid max-w-xl gap-4 rounded-2xl border border-line bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus((await updateProfile(profile)) ? "Profile saved." : null);
      }}
    >
      {mode === "member" && user ? <p className="text-sm text-muted">Signed in as {user.email}</p> : null}
      <Field label="Full name (used on certificates)" htmlFor="pr-name">
        <Input id="pr-name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
      </Field>
      <Field label="Headline" htmlFor="pr-headline" hint="e.g. Aspiring data analyst · Kigali">
        <Input id="pr-headline" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
      </Field>
      <Field label="About me" htmlFor="pr-bio">
        <Textarea id="pr-bio" rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
      </Field>
      <Field label="Weekly study goal (minutes)" htmlFor="pr-goal">
        <Input
          id="pr-goal"
          type="number"
          min={0}
          max={3000}
          value={profile.preferences.weeklyGoalMinutes ?? ""}
          onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, weeklyGoalMinutes: e.target.value ? Number(e.target.value) : undefined } })}
        />
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-teal-600"
          checked={Boolean(profile.preferences.emailUpdates)}
          onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, emailUpdates: e.target.checked } })}
        />
        Email me about new courses and live classes
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="teal">
          Save profile
        </Button>
        {status ? (
          <span role="status" className="text-sm text-leaf-700">
            {status}
          </span>
        ) : null}
      </div>
    </form>
  );
}
