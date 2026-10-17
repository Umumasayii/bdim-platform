"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { FormulaGrid, Question, QuestionTopic, QuestionType } from "@/lib/types";
import { deleteQuestion, saveQuestion } from "@/app/actions/admin";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { lines, toLines, useAdminAction } from "./admin-ui";

const TOPICS: QuestionTopic[] = ["Excel", "SQL", "Python", "R", "Statistics", "Probability", "Machine Learning", "Power BI", "GIS", "Survey Methods", "Data Interpretation"];
const TYPES: QuestionType[] = ["multiple-choice", "numeric", "short-answer", "formula", "code", "written"];

export function QuestionEditor({
  initial,
  isNew,
  courses,
  exercises,
}: {
  initial: Question;
  isNew: boolean;
  courses: { slug: string; title: string }[];
  exercises: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState<Question>(initial);
  const [gridText, setGridText] = useState(initial.formulaGrid ? JSON.stringify(initial.formulaGrid, null, 2) : "");
  const [gridError, setGridError] = useState<string | null>(null);
  const { run, pending, message } = useAdminAction();
  const set = <K extends keyof Question>(k: K, v: Question[K]) => setQ((x) => ({ ...x, [k]: v }));

  function save() {
    let formulaGrid: FormulaGrid | undefined;
    if (q.type === "formula") {
      try {
        formulaGrid = JSON.parse(gridText) as FormulaGrid;
        setGridError(null);
      } catch {
        setGridError("The worksheet must be valid JSON.");
        return;
      }
    }
    const slug = q.slug || slugify(q.title);
    const question: Question = {
      ...q,
      slug,
      id: q.id || slug,
      formulaGrid,
      options: q.type === "multiple-choice" ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
    };
    run(() => saveQuestion(question), () => isNew && router.replace(`/admin/questions/${question.id}`));
  }

  return (
    <div className="grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/questions" className="text-sm text-teal-700 hover:underline">
            ← Questions
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-navy-950">{isNew ? "New question" : q.title}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew ? (
            <Button variant="ghost" onClick={() => window.confirm("Delete this question?") && run(() => deleteQuestion(q.id), () => router.replace("/admin/questions"))}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          ) : null}
          <Button variant="teal" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save question"}
          </Button>
        </div>
      </div>
      {message}
      <div className="grid gap-4 rounded-2xl border border-line bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title" htmlFor="q-title" required>
            <Input id="q-title" value={q.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="URL slug" htmlFor="q-slug" hint="Leave empty to generate from the title.">
            <Input id="q-slug" value={q.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Topic" htmlFor="q-topic">
            <Select id="q-topic" value={q.topic} onChange={(e) => set("topic", e.target.value as QuestionTopic)}>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty" htmlFor="q-diff">
            <Select id="q-diff" value={q.difficulty} onChange={(e) => set("difficulty", e.target.value as Question["difficulty"])}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </Select>
          </Field>
          <Field label="Type" htmlFor="q-type">
            <Select id="q-type" value={q.type} onChange={(e) => set("type", e.target.value as QuestionType)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Language (optional)" htmlFor="q-lang">
            <Select id="q-lang" value={q.language ?? ""} onChange={(e) => set("language", (e.target.value || undefined) as Question["language"])}>
              <option value="">None</option>
              {["Python", "SQL", "R", "Excel", "DAX"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Prompt (Markdown)" htmlFor="q-prompt" required>
          <Textarea id="q-prompt" rows={5} value={q.prompt} onChange={(e) => set("prompt", e.target.value)} />
        </Field>

        {q.type === "multiple-choice" ? (
          <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
            <Field label="Options (one per line)" htmlFor="q-opts">
              <Textarea id="q-opts" rows={5} value={lines(q.options ?? [])} onChange={(e) => set("options", e.target.value.split("\n"))} />
            </Field>
            <Field label="Correct option #" htmlFor="q-ans">
              <Input id="q-ans" type="number" min={1} value={typeof q.answer === "number" ? q.answer + 1 : 1} onChange={(e) => set("answer", Number(e.target.value) - 1)} />
            </Field>
          </div>
        ) : null}
        {q.type === "numeric" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Correct answer" htmlFor="q-num">
              <Input id="q-num" type="number" step="any" value={typeof q.answer === "number" ? q.answer : ""} onChange={(e) => set("answer", Number(e.target.value))} />
            </Field>
            <Field label="Tolerance (±)" htmlFor="q-tol">
              <Input id="q-tol" type="number" step="any" min={0} value={q.tolerance ?? 0} onChange={(e) => set("tolerance", Number(e.target.value))} />
            </Field>
          </div>
        ) : null}
        {q.type === "short-answer" || q.type === "formula" ? (
          <Field label="Accepted answers (one per line)" htmlFor="q-acc" hint={q.type === "formula" ? "Reference formulas. Grading evaluates the learner's formula against the worksheet's expected value." : "Compared ignoring case and spaces."}>
            <Textarea id="q-acc" rows={3} className="font-mono" value={Array.isArray(q.answer) ? lines(q.answer) : ""} onChange={(e) => set("answer", toLines(e.target.value))} />
          </Field>
        ) : null}
        {q.type === "formula" ? (
          <Field label="Worksheet (JSON: columns, rows, cells, expected)" htmlFor="q-grid" error={gridError ?? undefined}>
            <Textarea id="q-grid" rows={10} className="font-mono text-xs" value={gridText} onChange={(e) => setGridText(e.target.value)} />
          </Field>
        ) : null}
        {q.type === "code" || q.type === "written" ? (
          <Notice tone="info">Code and written questions are self-assessed: learners compare their approach with the worked solution.</Notice>
        ) : null}

        <Field label="Hints (one per line, revealed in order)" htmlFor="q-hints">
          <Textarea id="q-hints" rows={3} value={lines(q.hints)} onChange={(e) => set("hints", toLines(e.target.value))} />
        </Field>
        <Field label="Worked solution (Markdown)" htmlFor="q-sol">
          <Textarea id="q-sol" rows={5} value={q.solution} onChange={(e) => set("solution", e.target.value)} />
        </Field>
        <Field label="Explanation" htmlFor="q-exp">
          <Textarea id="q-exp" rows={3} value={q.explanation} onChange={(e) => set("explanation", e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Related courses" htmlFor="q-courses" hint="Hold Ctrl / Cmd to select several.">
            <select
              id="q-courses"
              multiple
              className="h-36 w-full rounded-xl border border-line p-2 text-sm"
              value={q.relatedCourseSlugs}
              onChange={(e) => set("relatedCourseSlugs", Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {courses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid content-start gap-4">
            <Field label="Coding Lab exercise" htmlFor="q-lab">
              <Select id="q-lab" value={q.labExerciseId ?? ""} onChange={(e) => set("labExerciseId", e.target.value || undefined)}>
                <option value="">None</option>
                {exercises.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags (one per line)" htmlFor="q-tags">
              <Textarea id="q-tags" rows={2} value={lines(q.tags)} onChange={(e) => set("tags", toLines(e.target.value))} />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 border-t border-line pt-4 text-sm">
          {(
            [
              ["published", "Published"],
              ["free", "Free practice zone (visible to everyone)"],
              ["isSample", "Label as sample content"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" className="size-4 accent-teal-600" checked={q[k]} onChange={(e) => set(k, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
