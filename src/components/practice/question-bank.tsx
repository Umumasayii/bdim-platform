"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookmarkCheck, CheckCircle2, Circle, Search } from "lucide-react";
import type { Question } from "@/lib/types";
import { useLearner } from "@/lib/learner/provider";
import { Input, Select } from "@/components/ui/field";
import { Badge, levelTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

const topics = ["Excel", "SQL", "Python", "R", "Statistics", "Probability", "Machine Learning", "Power BI", "GIS", "Survey Methods", "Data Interpretation"];
const types = ["multiple-choice", "numeric", "short-answer", "formula", "code", "written"];

export function QuestionBank({ questions, initialTopic = "" }: { questions: Question[]; initialTopic?: string }) {
  const { state } = useLearner();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState("");
  const [language, setLanguage] = useState("");
  const [type, setType] = useState("");
  const [view, setView] = useState<"all" | "saved" | "todo" | "done">("all");

  const languages = useMemo(() => [...new Set(questions.map((x) => x.language).filter(Boolean))] as string[], [questions]);

  const filtered = questions.filter((x) => {
    const text = q.trim().toLowerCase();
    if (text && ![x.title, x.prompt, ...x.tags, x.topic].join(" ").toLowerCase().includes(text)) return false;
    if (topic && x.topic !== topic) return false;
    if (difficulty && x.difficulty !== difficulty) return false;
    if (language && x.language !== language) return false;
    if (type && x.type !== type) return false;
    if (view === "saved" && !state.saved[x.id]) return false;
    if (view === "done" && !state.completed[x.id]) return false;
    if (view === "todo" && state.completed[x.id]) return false;
    return true;
  });

  const attemptsFor = (id: string) => state.attempts.filter((a) => a.questionId === id);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,10rem))]">
        <div className="relative">
          <label htmlFor="q-search" className="sr-only">
            Search questions
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="q-search" type="search" placeholder="Search by keyword or tag" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All levels</option>
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </Select>
        <Select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Any language</option>
          {languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
        <Select aria-label="Question type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t.replace("-", " ")}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["all", "All"],
              ["todo", "Not completed"],
              ["done", "Completed"],
              ["saved", "My collection"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", view === v ? "bg-white text-navy-950 shadow-sm" : "text-muted hover:text-navy-900")}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {filtered.length} question{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {filtered.map((x) => {
            const attempts = attemptsFor(x.id);
            return (
              <li key={x.id}>
                <Link href={`/questions/${x.slug}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-surface sm:flex-row sm:items-center sm:gap-4">
                  <span className="flex min-w-0 flex-1 items-start gap-3">
                    {state.completed[x.id] ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf-500" aria-label="Completed" />
                    ) : (
                      <Circle className="mt-0.5 size-5 shrink-0 text-line" aria-label="Not completed" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold text-navy-950">{x.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {x.topic}
                        {x.language ? ` · ${x.language}` : ""} · {x.type.replace("-", " ")}
                        {attempts.length ? ` · ${attempts.filter((a) => a.correct).length}/${attempts.length} correct` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                    {state.saved[x.id] ? <BookmarkCheck className="size-4 text-teal-600" aria-label="Saved" /> : null}
                    {x.free ? <Badge tone="teal">Free</Badge> : null}
                    <Badge tone={levelTone(x.difficulty)}>{x.difficulty}</Badge>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState title={view === "saved" ? "Your collection is empty" : "No questions match"}>
            {view === "saved" ? "Use “Save” on any question to add it to your personal collection." : "Try removing a filter."}
          </EmptyState>
        </div>
      )}
    </div>
  );
}
