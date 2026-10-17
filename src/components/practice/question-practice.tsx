"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Circle, Code2, Lightbulb, XCircle } from "lucide-react";
import type { Question } from "@/lib/types";
import { evaluateFormula, formatCell, valuesMatch } from "@/lib/formula/engine";
import { useLearner } from "@/lib/learner/provider";
import { Markdown } from "@/components/ui/markdown";
import { Badge, levelTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { FormulaGridView } from "./formula-grid";

type Feedback = { correct: boolean; message: string } | null;

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/["“”]/g, "'");

export function QuestionPractice({
  question,
  compact = false,
  relatedCourses = [],
}: {
  question: Question;
  compact?: boolean;
  relatedCourses?: { slug: string; title: string }[];
}) {
  const { state, recordAttempt, toggleSaved, toggleCompleted } = useLearner();
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [formulaOutput, setFormulaOutput] = useState<string | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [selfAssessed, setSelfAssessed] = useState(false);

  const saved = Boolean(state.saved[question.id]);
  const completed = Boolean(state.completed[question.id]);
  const attempts = state.attempts.filter((a) => a.questionId === question.id);
  const correctCount = attempts.filter((a) => a.correct).length;
  const gradable = ["multiple-choice", "numeric", "short-answer", "formula"].includes(question.type);

  function grade(correct: boolean, message: string) {
    setFeedback({ correct, message });
    void recordAttempt(question.id, correct);
  }

  function check() {
    switch (question.type) {
      case "multiple-choice": {
        if (choice === null) return setFeedback({ correct: false, message: "Choose an option first." });
        const ok = choice === question.answer;
        return grade(ok, ok ? "Correct." : "Not quite — try again or open a hint.");
      }
      case "numeric": {
        const n = Number(text.replace(/,/g, ""));
        if (!text.trim() || Number.isNaN(n)) return setFeedback({ correct: false, message: "Enter a number." });
        const ok = Math.abs(n - (question.answer as number)) <= (question.tolerance ?? 0) + 1e-9;
        return grade(ok, ok ? "Correct." : "Not quite. Check your working, or open a hint.");
      }
      case "short-answer": {
        if (!text.trim()) return setFeedback({ correct: false, message: "Type an answer first." });
        const ok = (question.answer as string[]).some((a) => normalise(a) === normalise(text));
        return grade(ok, ok ? "Correct." : "That doesn't match the expected answer.");
      }
      case "formula": {
        if (!question.formulaGrid) return;
        const res = evaluateFormula(text, question.formulaGrid.cells);
        if (!res.ok) {
          setFormulaOutput(res.error);
          return grade(false, `Your formula returned an error: ${res.error}`);
        }
        setFormulaOutput(String(formatCell(res.value)));
        const ok = valuesMatch(res.value, question.formulaGrid.expected);
        return grade(ok, ok ? `Correct — your formula returns ${formatCell(res.value)}.` : `Your formula returns ${formatCell(res.value)}, which isn't the expected result.`);
      }
    }
  }

  return (
    <div className={cn("rounded-2xl border border-line bg-white", compact ? "p-5" : "p-6 sm:p-8")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="navy">{question.topic}</Badge>
        <Badge tone={levelTone(question.difficulty)}>{question.difficulty}</Badge>
        <Badge>{question.type.replace("-", " ")}</Badge>
        {question.isSample ? <Badge tone="amber">Sample content</Badge> : null}
        {!compact ? (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => void toggleSaved(question.id)} aria-pressed={saved}>
              {saved ? <BookmarkCheck className="size-4 text-teal-600" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
              {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void toggleCompleted(question.id)} aria-pressed={completed}>
              {completed ? <CheckCircle2 className="size-4 text-leaf-600" aria-hidden /> : <Circle className="size-4" aria-hidden />}
              {completed ? "Completed" : "Mark complete"}
            </Button>
          </div>
        ) : null}
      </div>

      {compact ? <h3 className="mt-3 text-lg font-bold text-navy-950">{question.title}</h3> : null}
      <Markdown source={question.prompt} className="mt-3 text-[15px]" />

      {question.type === "formula" && question.formulaGrid ? (
        <div className="mt-4">
          <FormulaGridView grid={question.formulaGrid} caption={`Worksheet for ${question.title}`} />
        </div>
      ) : null}

      {/* Answer area */}
      <div className="mt-5">
        {question.type === "multiple-choice" && question.options ? (
          <fieldset>
            <legend className="sr-only">Choose one answer</legend>
            <div className="grid gap-2">
              {question.options.map((opt, i) => {
                const selected = choice === i;
                const revealCorrect = feedback?.correct && selected;
                return (
                  <label
                    key={i}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                      selected ? "border-teal-500 bg-teal-50" : "border-line hover:bg-surface",
                      revealCorrect && "border-leaf-500 bg-leaf-50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      className="mt-0.5 accent-teal-600"
                      checked={selected}
                      onChange={() => {
                        setChoice(i);
                        setFeedback(null);
                      }}
                    />
                    <span className="font-mono text-[13px] leading-relaxed text-navy-900 [overflow-wrap:anywhere]">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {question.type === "numeric" || question.type === "short-answer" ? (
          <div className="max-w-md">
            <label htmlFor={`a-${question.id}`} className="mb-1.5 block text-sm font-medium">
              Your answer
            </label>
            <Input
              id={`a-${question.id}`}
              inputMode={question.type === "numeric" ? "decimal" : "text"}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFeedback(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && check()}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        ) : null}

        {question.type === "formula" ? (
          <div>
            <label htmlFor={`f-${question.id}`} className="mb-1.5 block text-sm font-medium">
              Formula
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`f-${question.id}`}
                placeholder="=SUM(D2:D9)"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFeedback(null);
                  setFormulaOutput(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && check()}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            {formulaOutput !== null ? (
              <p className="mt-2 text-sm text-muted">
                Result: <span className="font-mono font-semibold text-navy-900">{formulaOutput}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {question.type === "code" || question.type === "written" ? (
          <div>
            <label htmlFor={`w-${question.id}`} className="mb-1.5 block text-sm font-medium">
              Your approach <span className="font-normal text-muted">(not graded — compare with the worked solution)</span>
            </label>
            <Textarea id={`w-${question.id}`} value={text} onChange={(e) => setText(e.target.value)} className={question.type === "code" ? "font-mono" : ""} />
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn(
            "mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
            feedback.correct ? "bg-leaf-50 text-leaf-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {feedback.correct ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
          {feedback.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {gradable ? (
          <Button variant="teal" onClick={check}>
            Check answer
          </Button>
        ) : null}
        {question.hints.length > hintsShown ? (
          <Button variant="outline" onClick={() => setHintsShown((n) => n + 1)}>
            <Lightbulb className="size-4" aria-hidden /> {hintsShown ? "Another hint" : "Show a hint"}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => setShowSolution((v) => !v)} aria-expanded={showSolution}>
          {showSolution ? "Hide solution" : "Show worked solution"}
        </Button>
        {question.labExerciseId ? (
          <Link href={`/coding-lab?exercise=${question.labExerciseId}`} className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-teal-700 hover:underline">
            <Code2 className="size-4" aria-hidden /> Practise in the Coding Lab
          </Link>
        ) : null}
      </div>

      {hintsShown > 0 ? (
        <ol className="mt-4 grid gap-2">
          {question.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i} className="flex gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm text-navy-800">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
              <Markdown source={h} className="[&_p]:m-0" />
            </li>
          ))}
        </ol>
      ) : null}

      {showSolution ? (
        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Worked solution</p>
          <Markdown source={question.solution} className="mt-1" />
          {question.explanation ? (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-700">Why it matters</p>
              <Markdown source={question.explanation} className="mt-1" />
            </>
          ) : null}
          {!gradable && !selfAssessed ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-teal-100 pt-4">
              <span className="text-sm text-navy-800">How did you do?</span>
              <Button size="sm" variant="teal" onClick={() => (setSelfAssessed(true), void recordAttempt(question.id, true))}>
                I got it right
              </Button>
              <Button size="sm" variant="outline" onClick={() => (setSelfAssessed(true), void recordAttempt(question.id, false))}>
                Not yet
              </Button>
            </div>
          ) : null}
          {selfAssessed ? <p className="mt-3 text-sm text-muted">Recorded in your practice history.</p> : null}
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span>
            Your attempts: {attempts.length} · correct: {correctCount} · incorrect: {attempts.length - correctCount}
          </span>
          {relatedCourses.length ? (
            <span>
              Related learning:{" "}
              {relatedCourses.map((c, i) => (
                <span key={c.slug}>
                  {i ? ", " : ""}
                  <Link href={`/courses/${c.slug}`} className="font-medium text-teal-700 hover:underline">
                    {c.title}
                  </Link>
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
