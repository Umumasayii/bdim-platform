"use server";

import { isSupabaseConfigured } from "@/lib/config";
import { getStore } from "@/lib/data/store";
import type { QuizGradeResult } from "@/lib/learner/types";
import { createUserClient } from "@/lib/supabase/server";

/**
 * Grades a quiz against the server-held answer key (demo mode only).
 * With Supabase, grading happens in the submit_quiz() database function.
 */
export async function gradeQuizLocal(
  courseSlug: string,
  quizId: string,
  answers: Record<string, number>,
): Promise<{ ok: true; result: QuizGradeResult } | { ok: false; message: string }> {
  if (isSupabaseConfigured) return { ok: false, message: "Quizzes are graded by the database when accounts are enabled." };
  const course = (await getStore().listCourses()).find((c) => c.slug === courseSlug);
  const quiz = course?.modules.find((m) => m.quiz?.id === quizId)?.quiz;
  if (!quiz) return { ok: false, message: "Quiz not found." };
  const results = quiz.questions.map((q) => ({
    id: q.id,
    correct: answers[q.id] === q.answerIndex,
    answerIndex: q.answerIndex ?? -1,
    explanation: q.explanation ?? "",
  }));
  const score = quiz.questions.length ? Math.round((100 * results.filter((r) => r.correct).length) / quiz.questions.length) : 0;
  return { ok: true, result: { score, passed: score >= quiz.passMark, passMark: quiz.passMark, results } };
}

/** Short-lived signed URL for a private course material (Supabase Storage, RLS-checked). */
export async function getMaterialUrl(path: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: "File storage is not configured yet." };
  const db = await createUserClient();
  const { data, error } = await db.storage.from("course-materials").createSignedUrl(path, 60 * 10);
  if (error || !data) return { ok: false, message: "You don't have access to this file, or it doesn't exist." };
  return { ok: true, url: data.signedUrl };
}
