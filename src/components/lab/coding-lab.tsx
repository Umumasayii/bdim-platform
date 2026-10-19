"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Database, Eye, Loader2, Play, RotateCcw, ShieldCheck, Square, XCircle } from "lucide-react";
import type { LabDataset, LabExercise, LabLanguage } from "@/lib/types";
import { getRunner, outputText, type RunResult } from "@/lib/runners";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { Badge, levelTone } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse bg-surface" aria-label="Loading editor" />,
});

const LANGS: { id: LabLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "r", label: "R" },
];

const scratch: Record<LabLanguage, string> = {
  python: 'import pandas as pd\n\ndf = pd.read_csv("sales.csv")\nprint(df.head())\n',
  sql: "SELECT region, COUNT(*) AS orders\nFROM sales\nGROUP BY region;\n",
  r: 'df <- read.csv("sales.csv")\nsummary(df$revenue)\n',
};

function DatasetPreview({ d }: { d: LabDataset }) {
  const lines = d.csv.split("\n");
  const header = lines[0].split(",");
  const rows = lines.slice(1, 6).map((l) => l.split(","));
  return (
    <details className="group rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-medium text-navy-900">
          <Database className="size-4 text-teal-600" aria-hidden />
          <code className="font-mono text-xs">{d.fileName}</code>
          <span className="text-xs text-muted">· table {d.tableName}</span>
        </span>
        <span className="text-xs text-muted group-open:hidden">Preview</span>
      </summary>
      <div className="border-t border-line px-3 pb-3 pt-2">
        <p className="text-xs text-muted">{d.description}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full text-[11px]">
            <thead>
              <tr>
                {header.map((h) => (
                  <th key={h} className="whitespace-nowrap px-1.5 py-1 text-left font-semibold text-navy-900">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-muted">
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((c, j) => (
                    <td key={j} className="whitespace-nowrap px-1.5 py-1">
                      {c || <span className="text-amber-600">NA</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-muted">{lines.length - 1} rows · synthetic data</p>
      </div>
    </details>
  );
}

export function CodingLab({ exercises, datasets }: { exercises: LabExercise[]; datasets: LabDataset[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = exercises.find((e) => e.id === params.get("exercise")) ?? null;
  const [language, setLanguage] = useState<LabLanguage>(initial?.language ?? "python");
  const [exerciseId, setExerciseId] = useState<string>(initial?.id ?? exercises.find((e) => e.language === "python")?.id ?? "");
  const exercise = exercises.find((e) => e.id === exerciseId && e.language === language) ?? null;
  const [code, setCode] = useState(exercise?.starterCode ?? scratch[language]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const runningRef = useRef(false);

  const activeDatasets = useMemo(
    () => (exercise ? datasets.filter((d) => exercise.datasetIds.includes(d.id)) : datasets),
    [exercise, datasets],
  );

  useEffect(() => () => ["python", "sql", "r"].forEach((l) => getRunner(l as LabLanguage).dispose()), []);

  function selectExercise(id: string, lang: LabLanguage) {
    const ex = exercises.find((e) => e.id === id && e.language === lang) ?? null;
    setLanguage(lang);
    setExerciseId(ex?.id ?? "");
    setCode(ex?.starterCode ?? scratch[lang]);
    setResult(null);
    setShowSolution(false);
    router.replace(ex ? `/coding-lab?exercise=${ex.id}` : "/coding-lab", { scroll: false });
  }

  async function run() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setResult(null);
    const res = await getRunner(language).run(code, activeDatasets, setStatus);
    setResult(res);
    setStatus("");
    setRunning(false);
    runningRef.current = false;
  }

  function stop() {
    getRunner(language).dispose();
    runningRef.current = false;
    setRunning(false);
    setStatus("");
    setResult({ ok: false, stdout: "", stderr: "", error: "Execution stopped. The runtime will reload on the next run." });
  }

  const checks = exercise?.expectedOutputIncludes;
  const checkResult =
    result && result.ok && checks?.length
      ? checks.map((c) => ({ c, pass: outputText(result).includes(c) }))
      : null;
  const allPass = checkResult?.every((x) => x.pass);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Left: exercises and data */}
      <aside className="grid content-start gap-5">
        <div role="tablist" aria-label="Language" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
          {LANGS.map((l) => (
            <button
              key={l.id}
              role="tab"
              type="button"
              aria-selected={language === l.id}
              onClick={() => selectExercise(exercises.find((e) => e.language === l.id)?.id ?? "", l.id)}
              className={cn("rounded-lg py-2 text-sm font-semibold", language === l.id ? "bg-white text-navy-950 shadow-sm" : "text-muted hover:text-navy-900")}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="exercise" className="mb-1.5 block text-sm font-medium">
            Exercise
          </label>
          <Select id="exercise" value={exercise?.id ?? ""} onChange={(e) => selectExercise(e.target.value, language)}>
            {exercises
              .filter((e) => e.language === language)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            <option value="">Free practice (blank editor)</option>
          </Select>
        </div>

        {exercise ? (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={levelTone(exercise.level)}>{exercise.level}</Badge>
              {exercise.free ? <Badge tone="teal">Free</Badge> : <Badge>Course exercise</Badge>}
            </div>
            <h2 className="mt-2 font-bold text-navy-950">{exercise.title}</h2>
            <Markdown source={exercise.instructions} className="mt-1 text-sm" />
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
            Free practice: all sample datasets are available as files (Python, R) and tables (SQL).
          </div>
        )}

        <div className="grid gap-2">
          <p className="text-sm font-semibold text-navy-950">Datasets</p>
          {activeDatasets.map((d) => (
            <DatasetPreview key={d.id} d={d} />
          ))}
        </div>

        <p className="flex gap-2 rounded-xl bg-surface p-3 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-leaf-600" aria-hidden />
          Code runs in an isolated WebAssembly sandbox in your browser, with a time limit. Nothing is executed on BDIM&apos;s servers.
        </p>
      </aside>

      {/* Right: editor and output */}
      <div className="grid min-w-0 content-start gap-4">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
            <p className="text-xs font-medium text-muted">
              {getRunner(language).engineLabel} · <kbd className="rounded border border-line px-1">Ctrl</kbd>+<kbd className="rounded border border-line px-1">Enter</kbd> to run
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCode(exercise?.starterCode ?? scratch[language]);
                  setResult(null);
                }}
              >
                <RotateCcw className="size-4" aria-hidden /> Reset
              </Button>
              {exercise ? (
                <Button size="sm" variant="ghost" onClick={() => setShowSolution((v) => !v)} aria-expanded={showSolution}>
                  <Eye className="size-4" aria-hidden /> {showSolution ? "Hide" : "Solution"}
                </Button>
              ) : null}
              {running ? (
                <Button size="sm" variant="danger" onClick={stop}>
                  <Square className="size-3.5" aria-hidden /> Stop
                </Button>
              ) : (
                <Button size="sm" variant="teal" onClick={run}>
                  <Play className="size-4" aria-hidden /> Run
                </Button>
              )}
            </div>
          </div>
          <div className="h-[22rem]">
            <CodeEditor key={`${language}-${exerciseId}`} value={code} onChange={setCode} language={language} label={`${language} code editor`} onRun={run} />
          </div>
        </div>

        {showSolution && exercise ? (
          <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Reference solution</p>
              <Button size="sm" variant="ghost" onClick={() => setCode(exercise.solution)}>
                Load into editor
              </Button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-navy-950 p-4 font-mono text-[13px] text-teal-50">
              <code>{exercise.solution}</code>
            </pre>
          </div>
        ) : null}

        <section aria-label="Output" aria-live="polite" className="rounded-2xl border border-line bg-navy-950 text-sm text-navy-50">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">Output</p>
            {result?.ms !== undefined ? <p className="text-xs text-navy-300">Executed in your browser · {result.ms} ms</p> : null}
          </div>
          <div className="max-h-[28rem] overflow-auto p-4">
            {running ? (
              <p className="flex items-center gap-2 text-navy-200">
                <Loader2 className="size-4 animate-spin" aria-hidden /> {status || "Working…"}
              </p>
            ) : !result ? (
              <p className="text-navy-300">Run your code to see real output here.</p>
            ) : (
              <>
                {result.tables ? (
                  result.tables.length ? (
                    result.tables.map((t, i) => (
                      <div key={i} className="mb-4 overflow-x-auto">
                        <table className="min-w-full border-collapse font-mono text-xs">
                          <thead>
                            <tr>
                              {t.columns.map((c) => (
                                <th key={c} className="border-b border-white/20 px-2 py-1.5 text-left text-teal-200">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {t.values.map((row, ri) => (
                              <tr key={ri} className="border-b border-white/5">
                                {row.map((v, ci) => (
                                  <td key={ci} className="whitespace-nowrap px-2 py-1">
                                    {v === null ? <span className="text-navy-400">NULL</span> : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-1 text-[11px] text-navy-300">
                          {t.rowCount} row{t.rowCount === 1 ? "" : "s"}
                          {t.truncated ? " (first 500 shown)" : ""}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-navy-200">Query ran successfully and returned no rows.</p>
                  )
                ) : null}
                {result.stdout ? <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{result.stdout}</pre> : null}
                {result.stderr ? <pre className="mt-2 whitespace-pre-wrap font-mono text-[12px] text-amber-200">{result.stderr}</pre> : null}
                {result.error ? (
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[12px] text-red-300">
                    {result.timedOut ? "⏱ " : ""}
                    {result.error}
                  </pre>
                ) : null}
                {result.ok && !result.stdout && !result.tables?.length && !result.stderr ? (
                  <p className="text-navy-300">The code ran without printing anything. Use print() to show results.</p>
                ) : null}
              </>
            )}
          </div>
          {checkResult ? (
            <div className={cn("border-t px-4 py-3", allPass ? "border-leaf-500/30 bg-leaf-500/10" : "border-amber-400/30 bg-amber-400/10")}>
              <p className="flex items-center gap-2 font-semibold">
                {allPass ? <CheckCircle2 className="size-4 text-leaf-300" aria-hidden /> : <XCircle className="size-4 text-amber-300" aria-hidden />}
                {allPass ? "All checks passed" : "Not all checks passed yet"}
              </p>
              <ul className="mt-1 grid gap-0.5 text-xs text-navy-200">
                {checkResult.map((x) => (
                  <li key={x.c}>
                    {x.pass ? "✓" : "✗"} output contains <code className="font-mono">{x.c}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
