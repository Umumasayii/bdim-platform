"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, CheckCircle2, Clock, MonitorPlay, PlayCircle } from "lucide-react";
import type { Course } from "@/lib/types";
import { useLearner } from "@/lib/learner/provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { pricingLabel } from "./pricing";

export function certificateCourse(course: Course) {
  return {
    id: course.id,
    title: course.title,
    lessonIds: course.modules.flatMap((m) => m.lessons.map((l) => l.id)),
    quizIds: course.modules.flatMap((m) => (m.quiz ? [m.quiz.id] : [])),
    rules: course.certificate,
  };
}

export function EnrollPanel({ course }: { course: Course }) {
  const { ready, mode, state, enroll, certificateStatus, issueCertificate } = useLearner();
  const [busy, setBusy] = useState(false);
  const enrollment = state.enrollments[course.id];
  const lessons = course.modules.flatMap((m) => m.lessons);
  const done = lessons.filter((l) => state.lessonsCompleted[l.id]).length;
  const firstSample = lessons.find((l) => l.isSample);
  const nextLesson = lessons.find((l) => !state.lessonsCompleted[l.id]) ?? lessons[0];
  const access = enrollment && ["active", "completed"].includes(enrollment.status);
  const cert = state.certificates.find((c) => c.courseId === course.id);
  const certInput = certificateCourse(course);
  const status = certificateStatus(certInput);

  return (
    <aside className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
      <p className="text-2xl font-bold text-navy-950">{pricingLabel(course.pricing)}</p>
      {course.pricing.note ? <p className="mt-1 text-sm text-muted">{course.pricing.note}</p> : null}

      <ul className="mt-5 grid gap-2.5 text-sm text-navy-900">
        <li className="flex gap-2">
          <Clock className="size-4 shrink-0 text-teal-600" aria-hidden /> {course.duration}
        </li>
        <li className="flex gap-2">
          <MonitorPlay className="size-4 shrink-0 text-teal-600" aria-hidden /> {course.formats.join(" · ")}
        </li>
        {course.certificate.enabled ? (
          <li className="flex gap-2">
            <Award className="size-4 shrink-0 text-teal-600" aria-hidden /> Certificate of completion when requirements are met
          </li>
        ) : null}
      </ul>

      <div className="mt-6 grid gap-3">
        {!ready ? (
          <div className="h-11 animate-pulse rounded-xl bg-surface-2" />
        ) : access ? (
          <>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Progress</span>
                <span>
                  {done}/{lessons.length} lessons
                </span>
              </div>
              <ProgressBar value={(done / Math.max(1, lessons.length)) * 100} label="Course progress" />
            </div>
            <ButtonLink href={`/learn/${course.slug}/${nextLesson.id}`} variant="teal">
              <PlayCircle className="size-4" aria-hidden /> {done ? "Continue learning" : "Start learning"}
            </ButtonLink>
          </>
        ) : enrollment?.status === "requested" ? (
          <Notice tone="info" title="Enrollment requested">
            BDIM will confirm your enrollment and next steps. You can still open the free sample lessons.
          </Notice>
        ) : mode === "guest" ? (
          <ButtonLink href={`/sign-in?next=/courses/${course.slug}`} variant="teal">
            Sign in to enroll
          </ButtonLink>
        ) : (
          <Button
            variant="teal"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await enroll(course.id, course.enrollmentMode);
              setBusy(false);
            }}
          >
            {course.enrollmentMode === "open" ? "Enroll — start learning" : "Request enrollment"}
          </Button>
        )}

        {firstSample && !access ? (
          <ButtonLink href={`/learn/${course.slug}/${firstSample.id}`} variant="outline">
            Try a free sample lesson
          </ButtonLink>
        ) : null}
        <ButtonLink href="#inquiry" variant="ghost">
          Request a quote or group training
        </ButtonLink>
      </div>

      {access && course.certificate.enabled ? (
        <div className="mt-6 border-t border-line pt-5 text-sm">
          {cert ? (
            <Link href={`/dashboard/certificates/${cert.id}`} className="flex items-center gap-2 font-semibold text-leaf-700 hover:underline">
              <CheckCircle2 className="size-4" aria-hidden /> View your {cert.demo ? "demonstration " : ""}certificate
            </Link>
          ) : status.eligible ? (
            <Button
              variant="primary"
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await issueCertificate(certInput);
                setBusy(false);
              }}
            >
              <Award className="size-4" aria-hidden /> Claim certificate
            </Button>
          ) : (
            <p className="text-muted">
              Certificate requirements: {status.missingLessons ? `${status.missingLessons} lesson(s) left` : "all lessons done"}
              {certInput.quizIds.length ? ` · ${status.failingQuizzes ? `${status.failingQuizzes} quiz(zes) below ${course.certificate.minQuizScore}%` : "quizzes passed"}` : ""}.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}
