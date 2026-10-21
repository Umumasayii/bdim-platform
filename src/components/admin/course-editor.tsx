"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Course, CourseModule, DeliveryFormat, Lesson, Quiz } from "@/lib/types";
import { categories } from "@/content/categories";
import { saveCourse } from "@/app/actions/admin";
import { CourseDeleteDialog } from "./course-delete-dialog";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { lines, toLines, useAdminAction } from "./admin-ui";
import { RichTextEditor } from "./rich-text-editor";
import { LessonMediaEditor } from "./lesson-media-editor";

const FORMATS: DeliveryFormat[] = ["Live online", "In person (Kigali)", "Self-paced", "Corporate / group"];

/** ISO date-time → value for <input type="datetime-local"> in the admin's own time zone. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function move<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-navy-950">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-teal-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function QuizEditor({ quiz, onChange }: { quiz: Quiz; onChange: (q: Quiz | undefined) => void }) {
  return (
    <div className="grid gap-3 rounded-xl border border-dashed border-line p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field label="Quiz title" htmlFor={`${quiz.id}-t`}>
          <Input id={`${quiz.id}-t`} value={quiz.title} onChange={(e) => onChange({ ...quiz, title: e.target.value })} />
        </Field>
        <Field label="Pass mark %" htmlFor={`${quiz.id}-p`}>
          <Input id={`${quiz.id}-p`} type="number" min={0} max={100} value={quiz.passMark} onChange={(e) => onChange({ ...quiz, passMark: Number(e.target.value) })} />
        </Field>
      </div>
      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="grid gap-2 rounded-lg bg-surface p-3">
          <Field label={`Question ${qi + 1}`} htmlFor={`${quiz.id}-${q.id}`}>
            <Input
              id={`${quiz.id}-${q.id}`}
              value={q.prompt}
              onChange={(e) => onChange({ ...quiz, questions: quiz.questions.map((x, i) => (i === qi ? { ...x, prompt: e.target.value } : x)) })}
            />
          </Field>
          <Field label="Options (one per line)" htmlFor={`${quiz.id}-${q.id}-o`}>
            <Textarea
              id={`${quiz.id}-${q.id}-o`}
              rows={4}
              value={lines(q.options)}
              onChange={(e) => onChange({ ...quiz, questions: quiz.questions.map((x, i) => (i === qi ? { ...x, options: e.target.value.split("\n") } : x)) })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Field label="Correct option #" htmlFor={`${quiz.id}-${q.id}-a`}>
              <Input
                id={`${quiz.id}-${q.id}-a`}
                type="number"
                min={1}
                value={(q.answerIndex ?? 0) + 1}
                onChange={(e) => onChange({ ...quiz, questions: quiz.questions.map((x, i) => (i === qi ? { ...x, answerIndex: Number(e.target.value) - 1 } : x)) })}
              />
            </Field>
            <Field label="Explanation" htmlFor={`${quiz.id}-${q.id}-x`}>
              <Input
                id={`${quiz.id}-${q.id}-x`}
                value={q.explanation ?? ""}
                onChange={(e) => onChange({ ...quiz, questions: quiz.questions.map((x, i) => (i === qi ? { ...x, explanation: e.target.value } : x)) })}
              />
            </Field>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, i) => i !== qi) })}>
              <Trash2 className="size-4" aria-hidden /> Remove question
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange({
              ...quiz,
              questions: [...quiz.questions, { id: `q${Date.now().toString(36)}`, prompt: "", options: ["", ""], answerIndex: 0, explanation: "" }],
            })
          }
        >
          <Plus className="size-4" aria-hidden /> Add question
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
          Remove quiz
        </Button>
      </div>
    </div>
  );
}

export function CourseEditor({
  initial,
  isNew,
  exerciseIds,
  isAdmin = false,
}: {
  initial: Course;
  isNew: boolean;
  exerciseIds: { id: string; title: string }[];
  isAdmin?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const [c, setC] = useState<Course>(initial);
  const [openModule, setOpenModule] = useState<string | null>(initial.modules[0]?.id ?? null);
  const { run, pending, message } = useAdminAction();
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setC((x) => ({ ...x, [k]: v }));
  const setModule = (mi: number, m: CourseModule) => set("modules", c.modules.map((x, i) => (i === mi ? m : x)));
  const setLesson = (mi: number, li: number, l: Lesson) => setModule(mi, { ...c.modules[mi], lessons: c.modules[mi].lessons.map((x, i) => (i === li ? l : x)) });

  function save() {
    const slug = c.slug || slugify(c.title);
    const course: Course = {
      ...c,
      slug,
      id: c.id || slug,
      modules: c.modules.map((m) => ({
        ...m,
        quiz: m.quiz
          ? { ...m.quiz, questions: m.quiz.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) })) }
          : undefined,
      })),
    };
    run(() => saveCourse(course), () => {
      if (isNew) router.replace(`/admin/courses/${course.id}`);
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/courses" className="text-sm text-teal-700 hover:underline">
            ← Courses
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-navy-950">{isNew ? "New course" : c.title}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew ? (
            <>
              <Link href={`/courses/${c.slug}`} className="inline-flex h-11 items-center px-3 text-sm font-semibold text-teal-700 hover:underline" target="_blank">
                View
              </Link>
              {isAdmin ? (
                <Button variant="ghost" disabled={pending} onClick={() => setDeleting(true)}>
                  <Trash2 className="size-4" aria-hidden /> Delete
                </Button>
              ) : null}
            </>
          ) : null}
          <Button variant="teal" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save course"}
          </Button>
        </div>
      </div>
      {message}
      {deleting ? (
        <CourseDeleteDialog
          course={{ id: initial.id, title: initial.title, published: initial.published }}
          onClose={() => setDeleting(false)}
          onDone={(msg, deleted) => {
            setDeleting(false);
            if (deleted) router.replace("/admin/courses");
            else {
              setC((prev) => ({ ...prev, published: false }));
              run(async () => ({ ok: true, message: msg }));
            }
          }}
        />
      ) : null}

      <Section title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" htmlFor="c-title" required>
            <Input id="c-title" value={c.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="URL slug" htmlFor="c-slug" hint={isNew ? "Leave empty to generate from the title." : "Changing the slug changes the page URL."}>
            <Input id="c-slug" value={c.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Category" htmlFor="c-cat">
            <Select id="c-cat" value={c.category} onChange={(e) => set("category", e.target.value as Course["category"])}>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level" htmlFor="c-level">
            <Select id="c-level" value={c.level} onChange={(e) => set("level", e.target.value as Course["level"])}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </Select>
          </Field>
        </div>
        <Field label="Summary (cards and search results)" htmlFor="c-summary" required>
          <Textarea id="c-summary" rows={2} value={c.summary} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="c-desc">
          <Textarea id="c-desc" rows={4} value={c.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Prerequisites (one per line)" htmlFor="c-pre">
            <Textarea id="c-pre" rows={3} value={lines(c.prerequisites)} onChange={(e) => set("prerequisites", toLines(e.target.value))} />
          </Field>
          <Field label="Skills (one per line)" htmlFor="c-skills">
            <Textarea id="c-skills" rows={3} value={lines(c.skills)} onChange={(e) => set("skills", toLines(e.target.value))} />
          </Field>
          <Field label="Learning objectives (one per line)" htmlFor="c-obj">
            <Textarea id="c-obj" rows={4} value={lines(c.objectives)} onChange={(e) => set("objectives", toLines(e.target.value))} />
          </Field>
          <Field label="Tools (one per line)" htmlFor="c-tools">
            <Textarea id="c-tools" rows={4} value={lines(c.tools)} onChange={(e) => set("tools", toLines(e.target.value))} />
          </Field>
        </div>
      </Section>

      <Section title="Delivery, pricing & visibility">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Indicative duration" htmlFor="c-dur">
            <Input id="c-dur" value={c.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 4 weeks · 2 sessions per week" />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Formats</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {FORMATS.map((f) => (
                <Check key={f} label={f} checked={c.formats.includes(f)} onChange={(v) => set("formats", v ? [...c.formats, f] : c.formats.filter((x) => x !== f))} />
              ))}
            </div>
          </fieldset>
          <Field label="Pricing display" htmlFor="c-price" hint="Keep “Request a quote” until prices are formally set.">
            <Select id="c-price" value={c.pricing.mode} onChange={(e) => set("pricing", { ...c.pricing, mode: e.target.value as Course["pricing"]["mode"] })}>
              <option value="quote">Request a quote</option>
              <option value="contact">Contact us for pricing</option>
              <option value="free">Free</option>
              <option value="fixed">Fixed price</option>
            </Select>
          </Field>
          {c.pricing.mode === "fixed" ? (
            <div className="grid grid-cols-[6rem_1fr] gap-2">
              <Field label="Currency" htmlFor="c-cur">
                <Input id="c-cur" value={c.pricing.currency ?? "RWF"} onChange={(e) => set("pricing", { ...c.pricing, currency: e.target.value })} />
              </Field>
              <Field label="Amount" htmlFor="c-amt">
                <Input id="c-amt" type="number" min={0} value={c.pricing.amount ?? ""} onChange={(e) => set("pricing", { ...c.pricing, amount: Number(e.target.value) || undefined })} />
              </Field>
            </div>
          ) : (
            <Field label="Pricing note" htmlFor="c-pnote">
              <Input id="c-pnote" value={c.pricing.note ?? ""} onChange={(e) => set("pricing", { ...c.pricing, note: e.target.value })} />
            </Field>
          )}
          <Field label="Enrollment" htmlFor="c-enr">
            <Select id="c-enr" value={c.enrollmentMode} onChange={(e) => set("enrollmentMode", e.target.value as Course["enrollmentMode"])}>
              <option value="approval">Learners request; BDIM approves</option>
              <option value="open">Learners can self-enroll</option>
            </Select>
          </Field>
          <Field label="Sort order" htmlFor="c-sort">
            <Input id="c-sort" type="number" value={c.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Check label="Published (visible on the site)" checked={c.published} onChange={(v) => set("published", v)} />
          <Check label="Featured on the homepage" checked={c.featured} onChange={(v) => set("featured", v)} />
        </div>
        <fieldset className="grid gap-3 rounded-xl bg-surface p-4">
          <legend className="text-sm font-semibold">Certificate requirements</legend>
          <Check label="Issue certificates for this course" checked={c.certificate.enabled} onChange={(v) => set("certificate", { ...c.certificate, enabled: v })} />
          <Check label="Require every lesson to be completed" checked={c.certificate.requireAllLessons} onChange={(v) => set("certificate", { ...c.certificate, requireAllLessons: v })} />
          <Field label="Minimum score on every module quiz (%)" htmlFor="c-minq" className="max-w-xs">
            <Input id="c-minq" type="number" min={0} max={100} value={c.certificate.minQuizScore} onChange={(e) => set("certificate", { ...c.certificate, minQuizScore: Number(e.target.value) })} />
          </Field>
        </fieldset>
      </Section>

      <Section title={`Modules (${c.modules.length})`}>
        {c.modules.map((m, mi) => (
          <div key={m.id} className="rounded-xl border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3">
              <button type="button" className="text-left font-semibold text-navy-950" onClick={() => setOpenModule(openModule === m.id ? null : m.id)} aria-expanded={openModule === m.id}>
                {mi + 1}. {m.title || "Untitled module"} <span className="text-xs font-normal text-muted">· {m.lessons.length} lessons</span>
              </button>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label="Move module up" onClick={() => set("modules", move(c.modules, mi, -1))}>
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button size="sm" variant="ghost" aria-label="Move module down" onClick={() => set("modules", move(c.modules, mi, 1))}>
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete module"
                  onClick={() => window.confirm("Delete this module and its lessons?") && set("modules", c.modules.filter((_, i) => i !== mi))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            {openModule === m.id ? (
              <div className="grid gap-4 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Module title" htmlFor={`${m.id}-t`}>
                    <Input id={`${m.id}-t`} value={m.title} onChange={(e) => setModule(mi, { ...m, title: e.target.value })} />
                  </Field>
                  <Field label="Module summary" htmlFor={`${m.id}-s`}>
                    <Input id={`${m.id}-s`} value={m.summary} onChange={(e) => setModule(mi, { ...m, summary: e.target.value })} />
                  </Field>
                </div>

                {m.lessons.map((l, li) => (
                  <details key={l.id} className="rounded-xl border border-line">
                    <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm">
                      <span>
                        <strong>Lesson {li + 1}:</strong> {l.title || "Untitled"} {l.isSample ? <span className="text-teal-700">(free sample)</span> : null}
                        {l.content ? null : <span className="text-amber-700"> · no content yet</span>}
                      </span>
                    </summary>
                    <div className="grid gap-3 border-t border-line p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                        <Field label="Title" htmlFor={`${l.id}-t`}>
                          <Input id={`${l.id}-t`} value={l.title} onChange={(e) => setLesson(mi, li, { ...l, title: e.target.value })} />
                        </Field>
                        <Field label="Minutes" htmlFor={`${l.id}-m`}>
                          <Input id={`${l.id}-m`} type="number" min={0} value={l.durationMinutes} onChange={(e) => setLesson(mi, li, { ...l, durationMinutes: Number(e.target.value) })} />
                        </Field>
                      </div>
                      <Field label="Summary" htmlFor={`${l.id}-s`}>
                        <Input id={`${l.id}-s`} value={l.summary} onChange={(e) => setLesson(mi, li, { ...l, summary: e.target.value })} />
                      </Field>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-navy-900">Lesson content</p>
                        <RichTextEditor id={`${l.id}-c`} value={l.content ?? ""} onChange={(v) => setLesson(mi, li, { ...l, content: v })} />
                      </div>
                      <LessonMediaEditor courseId={c.id} lesson={l} onChange={(next) => setLesson(mi, li, next)} />
                      <Field label="Coding Lab exercise" htmlFor={`${l.id}-x`} className="max-w-md">
                        <Select id={`${l.id}-x`} value={l.exerciseId ?? ""} onChange={(e) => setLesson(mi, li, { ...l, exerciseId: e.target.value || undefined })}>
                          <option value="">None</option>
                          {exerciseIds.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.title}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Check label="Free sample lesson (visible without enrollment)" checked={Boolean(l.isSample)} onChange={(v) => setLesson(mi, li, { ...l, isSample: v })} />
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" aria-label="Move lesson up" onClick={() => setModule(mi, { ...m, lessons: move(m.lessons, li, -1) })}>
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Move lesson down" onClick={() => setModule(mi, { ...m, lessons: move(m.lessons, li, 1) })}>
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setModule(mi, { ...m, lessons: m.lessons.filter((_, i) => i !== li) })}>
                            <Trash2 className="size-4" aria-hidden /> Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setModule(mi, {
                        ...m,
                        lessons: [...m.lessons, { id: `${m.id}-l${Date.now().toString(36)}`, title: "", summary: "", durationMinutes: 30, content: "" }],
                      })
                    }
                  >
                    <Plus className="size-4" aria-hidden /> Add lesson
                  </Button>
                  {!m.quiz ? (
                    <Button size="sm" variant="ghost" onClick={() => setModule(mi, { ...m, quiz: { id: `${m.id}-quiz`, title: `${m.title} check`, passMark: 70, questions: [] } })}>
                      <Plus className="size-4" aria-hidden /> Add quiz
                    </Button>
                  ) : null}
                  {!m.assignment ? (
                    <Button size="sm" variant="ghost" onClick={() => setModule(mi, { ...m, assignment: { id: `${m.id}-assignment`, title: "", brief: "" } })}>
                      <Plus className="size-4" aria-hidden /> Add assignment
                    </Button>
                  ) : null}
                </div>
                {m.quiz ? <QuizEditor quiz={m.quiz} onChange={(q) => setModule(mi, { ...m, quiz: q })} /> : null}
                {m.assignment ? (
                  <div className="grid gap-3 rounded-xl border border-dashed border-line p-4">
                    <Field label="Assignment title" htmlFor={`${m.id}-at`}>
                      <Input id={`${m.id}-at`} value={m.assignment.title} onChange={(e) => setModule(mi, { ...m, assignment: { ...m.assignment!, title: e.target.value } })} />
                    </Field>
                    <Field label="Brief" htmlFor={`${m.id}-ab`}>
                      <Textarea id={`${m.id}-ab`} rows={3} value={m.assignment.brief} onChange={(e) => setModule(mi, { ...m, assignment: { ...m.assignment!, brief: e.target.value } })} />
                    </Field>
                    <Field label="Deadline (optional) — submissions close automatically at this time" htmlFor={`${m.id}-ad`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id={`${m.id}-ad`}
                          type="datetime-local"
                          className="w-auto"
                          value={toLocalInput(m.assignment.dueAt)}
                          onChange={(e) => setModule(mi, { ...m, assignment: { ...m.assignment!, dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined } })}
                        />
                        {m.assignment.dueAt ? (
                          <Button size="sm" variant="ghost" onClick={() => setModule(mi, { ...m, assignment: { ...m.assignment!, dueAt: undefined } })}>
                            No deadline
                          </Button>
                        ) : null}
                      </div>
                    </Field>
                    <div>
                      <Button size="sm" variant="ghost" onClick={() => setModule(mi, { ...m, assignment: undefined })}>
                        Remove assignment
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
        <div>
          <Button
            variant="outline"
            onClick={() => {
              const id = `${c.id || slugify(c.title) || "course"}-m${Date.now().toString(36)}`;
              set("modules", [...c.modules, { id, title: "", summary: "", lessons: [] }]);
              setOpenModule(id);
            }}
          >
            <Plus className="size-4" aria-hidden /> Add module
          </Button>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button variant="teal" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save course"}
        </Button>
      </div>
    </div>
  );
}
