"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Quiz } from "@/lib/types";
import type { QuizGradeResult } from "@/lib/learner/types";
import { useLearner } from "@/lib/learner/provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";

type PublicQuiz = { id: string; title: string; passMark: number; questions: { id: string; prompt: string; options: string[] }[] };

export function ModuleQuiz({ quiz, courseSlug, courseId }: { quiz: Quiz; courseSlug: string; courseId: string }) {
  const { mode, state, submitQuiz } = useLearner();
  const [loaded, setLoaded] = useState<PublicQuiz | null>(mode === "member" ? null : quiz);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizGradeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const previous = state.quizResults[quiz.id];

  useEffect(() => {
    if (mode !== "member") return;
    const db = getBrowserSupabase();
    if (!db) return;
    db.rpc("get_quiz", { p_quiz_id: quiz.id }).then(({ data, error }) => {
      if (error) setLoadError(error.message.includes("not_enrolled") ? "An active enrollment is required to take this quiz." : error.message);
      else setLoaded(data as PublicQuiz);
    });
  }, [mode, quiz.id]);

  if (loadError) return <Notice tone="warning">{loadError}</Notice>;
  if (!loaded) return <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-label="Loading quiz" />;

  const allAnswered = loaded.questions.every((q) => answers[q.id] !== undefined);
  const resultFor = (id: string) => result?.results.find((r) => r.id === id);

  return (
    <section className="rounded-2xl border border-line bg-white p-6" aria-labelledby={`quiz-${quiz.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`quiz-${quiz.id}`} className="text-lg font-bold text-navy-950">
          Module quiz: {loaded.title}
        </h2>
        <p className="text-xs text-muted">
          Pass mark {loaded.passMark}%{previous ? ` · best so far ${previous.best}% (${previous.attempts} attempt${previous.attempts === 1 ? "" : "s"})` : ""}
        </p>
      </div>
      <ol className="mt-5 grid gap-6">
        {loaded.questions.map((q, qi) => {
          const r = resultFor(q.id);
          return (
            <li key={q.id}>
              <fieldset>
                <legend className="font-medium text-navy-950">
                  {qi + 1}. {q.prompt}
                </legend>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
                        answers[q.id] === oi ? "border-teal-500 bg-teal-50" : "border-line hover:bg-surface",
                        r && r.answerIndex === oi && "border-leaf-500 bg-leaf-50",
                      )}
                    >
                      <input
                        type="radio"
                        name={`${quiz.id}-${q.id}`}
                        className="accent-teal-600"
                        checked={answers[q.id] === oi}
                        disabled={Boolean(result)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                {r ? (
                  <p className={cn("mt-2 flex items-start gap-2 text-sm", r.correct ? "text-leaf-700" : "text-amber-800")}>
                    {r.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    <span>
                      {r.correct ? "Correct." : "Not quite."} {r.explanation}
                    </span>
                  </p>
                ) : null}
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {result ? (
          <>
            <p role="status" className={cn("font-semibold", result.passed ? "text-leaf-700" : "text-amber-800")}>
              Score {result.score}% — {result.passed ? "passed" : `below the ${result.passMark}% pass mark`}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <Button
            variant="teal"
            disabled={!allAnswered || busy}
            onClick={async () => {
              setBusy(true);
              setResult(await submitQuiz(courseSlug, courseId, quiz.id, answers));
              setBusy(false);
            }}
          >
            {busy ? "Grading…" : "Submit answers"}
          </Button>
        )}
      </div>
    </section>
  );
}
