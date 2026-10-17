"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Code2, Download, Lock, Paperclip } from "lucide-react";
import type { Course } from "@/lib/types";
import { SUBMISSION_MAX_BYTES, useLearner } from "@/lib/learner/provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { getMaterialUrl } from "@/app/actions/learning";
import { Markdown } from "@/components/ui/markdown";
import { Button, ButtonLink } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { ModuleQuiz } from "./module-quiz";
import { LessonVideo } from "./lesson-video";
import type { LessonContentResult } from "@/lib/data/lessons";

function NotesBox({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { state, saveNote, mode } = useLearner();
  const saved = state.notes[lessonId]?.body ?? "";
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<string | null>(null);
  if (mode === "guest") return null;
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <label htmlFor={`note-${lessonId}`} className="font-semibold text-navy-950">
        My notes
      </label>
      <Textarea id={`note-${lessonId}`} className="mt-2" rows={4} value={draft} onChange={(e) => (setDraft(e.target.value), setStatus(null))} placeholder="Write key points, questions or reminders…" />
      <div className="mt-2 flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={draft === saved}
          onClick={async () => setStatus((await saveNote(courseId, lessonId, draft)) ? "Saved." : "Could not save.")}
        >
          Save note
        </Button>
        {status ? (
          <span role="status" className="text-xs text-muted">
            {status}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function AssignmentBox({ courseId, assignment }: { courseId: string; assignment: NonNullable<Course["modules"][number]["assignment"]> }) {
  const { state, submitAssignment, mode } = useLearner();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  async function openFile(path: string) {
    const db = getBrowserSupabase();
    const res = db ? await db.storage.from("submissions").createSignedUrl(path, 600) : null;
    if (res?.data) window.open(res.data.signedUrl, "_blank", "noopener");
    else setFileError("Could not open the file.");
  }
  const submissions = state.assignments.filter((a) => a.assignmentId === assignment.id);
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-bold text-navy-950">Assignment: {assignment.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-900">{assignment.brief}</p>
      {submissions.length ? (
        <ul className="mt-4 grid gap-2">
          {submissions.map((s) => (
            <li key={s.id} className="rounded-xl bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-navy-900">
                  Submitted {new Date(s.at).toLocaleDateString("en-GB")} · {s.status === "reviewed" ? "Reviewed" : "Awaiting review"}
                </p>
                {s.score != null ? (
                  <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    Grade: {s.score}/{s.maxScore ?? 100}
                  </span>
                ) : null}
              </div>
              {s.filePath ? (
                <button type="button" onClick={() => void openFile(s.filePath!)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 underline">
                  <Paperclip className="size-3.5" aria-hidden /> {s.fileName || "Attached file"}
                </button>
              ) : null}
              {s.feedback ? <p className="mt-1 whitespace-pre-line text-muted">Feedback: {s.feedback}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 grid gap-3">
        <label htmlFor={`asg-${assignment.id}`} className="text-sm font-medium">
          Your submission
        </label>
        <Textarea id={`asg-${assignment.id}`} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Summarise your work and findings." />
        <label htmlFor={`asg-link-${assignment.id}`} className="text-sm font-medium">
          Link to your file or repository (optional)
        </label>
        <Input id={`asg-link-${assignment.id}`} type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        {mode === "member" ? (
          <>
            <label htmlFor={`asg-file-${assignment.id}`} className="text-sm font-medium">
              Attach a file (optional, max 20 MB — PDF, Word, Excel, notebook, ZIP…)
            </label>
            <input
              key={fileKey}
              id={`asg-file-${assignment.id}`}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                const tooBig = Boolean(f && f.size > SUBMISSION_MAX_BYTES);
                setFileError(tooBig ? "That file is larger than 20 MB." : null);
                setFile(tooBig ? null : f);
              }}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100"
            />
          </>
        ) : (
          <p className="text-xs text-muted">Sign in with an account to attach files. In demo mode, paste a link instead.</p>
        )}
        {fileError ? (
          <p role="alert" className="text-xs font-medium text-red-600">
            {fileError}
          </p>
        ) : null}
        <div>
          <Button
            variant="teal"
            disabled={!body.trim() || busy}
            onClick={async () => {
              setBusy(true);
              if (await submitAssignment(courseId, assignment.id, body.trim(), link.trim(), file)) {
                setBody("");
                setLink("");
                setFile(null);
                setFileKey((k) => k + 1);
              }
              setBusy(false);
            }}
          >
            {busy ? "Submitting…" : "Submit assignment"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function LessonView({ course, lessonId, content }: { course: Course; lessonId: string; content: LessonContentResult }) {
  const { ready, mode, state, enroll, setLessonComplete, toggleBookmark, setLastLesson } = useLearner();
  const lessons = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  const index = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[index];
  const mod = course.modules.find((m) => m.id === lesson.moduleId)!;
  const isLastInModule = mod.lessons[mod.lessons.length - 1]?.id === lesson.id;
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const enrollment = state.enrollments[course.id];
  const hasAccess = Boolean(lesson.isSample) || (enrollment && ["active", "completed"].includes(enrollment.status));
  const completed = Boolean(state.lessonsCompleted[lesson.id]);
  const bookmarked = Boolean(state.bookmarks[lesson.id]);
  const [materialError, setMaterialError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && hasAccess) setLastLesson(course.id, course.slug, lesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record once per lesson view
  }, [ready, hasAccess, lesson.id]);

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;

  if (!hasAccess || content.status === "locked") {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <Lock className="mx-auto size-8 text-muted" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-navy-950">{lesson.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {enrollment?.status === "requested"
            ? "Your enrollment request is awaiting confirmation from BDIM."
            : "This lesson is available to enrolled learners. Sample lessons in this course are free to preview."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {mode === "guest" ? (
            <ButtonLink href={`/sign-in?next=/learn/${course.slug}/${lesson.id}`} variant="teal">
              Sign in
            </ButtonLink>
          ) : !enrollment ? (
            <Button variant="teal" onClick={() => void enroll(course.id, course.enrollmentMode)}>
              {course.enrollmentMode === "open" ? "Enroll now" : "Request enrollment"}
            </Button>
          ) : null}
          <ButtonLink href={`/courses/${course.slug}`} variant="outline">
            Back to course
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <article className="rounded-2xl border border-line bg-white p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">
          {mod.title} · {lesson.durationMinutes} min
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold text-navy-950">{lesson.title}</h1>
          {mode !== "guest" ? (
            <Button variant="ghost" size="sm" onClick={() => void toggleBookmark(course.id, lesson.id)} aria-pressed={bookmarked}>
              {bookmarked ? <BookmarkCheck className="size-4 text-teal-600" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-muted">{lesson.summary}</p>

        {lesson.videoUrl ? (
          <div className="mt-6">
            <LessonVideo url={lesson.videoUrl} title={lesson.title} />
          </div>
        ) : null}

        <div className="mt-8">
          {content.status === "ok" ? (
            <Markdown source={content.body} />
          ) : !lesson.videoUrl && !lesson.resources?.length ? (
            <Notice tone="info" title="Lesson materials in preparation">
              The full materials for this lesson are being prepared by the instructor. The outline above shows what it will cover.
            </Notice>
          ) : null}
        </div>

        {lesson.exerciseId ? (
          <div className="mt-8 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <p className="flex items-center gap-2 font-semibold text-navy-950">
              <Code2 className="size-4 text-teal-600" aria-hidden /> Practise this lesson
            </p>
            <p className="mt-1 text-sm text-muted">Open the matching exercise in the Coding Lab — it runs in your browser.</p>
            <ButtonLink href={`/coding-lab?exercise=${lesson.exerciseId}`} size="sm" variant="teal" className="mt-3">
              Open exercise
            </ButtonLink>
          </div>
        ) : null}

        {lesson.resources?.length ? (
          <div className="mt-8">
            <h2 className="font-semibold text-navy-950">Learning materials</h2>
            {materialError ? <Notice tone="warning" className="mt-2">{materialError}</Notice> : null}
            <ul className="mt-2 grid gap-2">
              {lesson.resources.map((r) => (
                <li key={r.url}>
                  {r.url.startsWith("storage:") ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
                      onClick={async () => {
                        const res = await getMaterialUrl(r.url.slice("storage:".length));
                        if (res.ok) window.open(res.url, "_blank", "noopener");
                        else setMaterialError(res.message);
                      }}
                    >
                      <Download className="size-4" aria-hidden /> {r.label}
                    </button>
                  ) : (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
                      <Download className="size-4" aria-hidden /> {r.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {mode !== "guest" ? (
            <Button variant={completed ? "outline" : "teal"} onClick={() => void setLessonComplete(course.id, lesson.id, !completed)} aria-pressed={completed}>
              <CheckCircle2 className="size-4" aria-hidden /> {completed ? "Completed — mark as not done" : "Mark lesson complete"}
            </Button>
          ) : (
            <ButtonLink href={`/sign-in?next=/learn/${course.slug}/${lesson.id}`} variant="outline">
              Sign in to track progress
            </ButtonLink>
          )}
          <div className="flex gap-2">
            {prev ? (
              <ButtonLink href={`/learn/${course.slug}/${prev.id}`} variant="ghost" size="sm">
                <ArrowLeft className="size-4" aria-hidden /> Previous
              </ButtonLink>
            ) : null}
            {next ? (
              <ButtonLink href={`/learn/${course.slug}/${next.id}`} variant="outline" size="sm">
                Next <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </article>

      {mode !== "guest" ? <NotesBox key={lesson.id} courseId={course.id} lessonId={lesson.id} /> : null}
      {isLastInModule && mod.quiz && hasAccess && !lesson.isSample ? <ModuleQuiz quiz={mod.quiz} courseSlug={course.slug} courseId={course.id} /> : null}
      {isLastInModule && mod.assignment && hasAccess && !lesson.isSample ? <AssignmentBox courseId={course.id} assignment={mod.assignment} /> : null}
    </div>
  );
}
