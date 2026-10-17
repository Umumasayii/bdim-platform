"use client";

import { useState } from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import type { FormulaExercise } from "@/lib/types";
import { evaluateFormula, formatCell, valuesMatch } from "@/lib/formula/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Badge, levelTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FormulaGridView } from "./formula-grid";

/** Excel-style formula practice: formulas are actually evaluated against the sheet. */
export function FormulaLab({ exercises }: { exercises: FormulaExercise[] }) {
  const [active, setActive] = useState(0);
  const [formula, setFormula] = useState("");
  const [output, setOutput] = useState<{ ok: boolean; text: string; correct: boolean } | null>(null);
  const [hint, setHint] = useState(false);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const ex = exercises[active];

  function evaluate() {
    const res = evaluateFormula(formula, ex.grid.cells);
    if (!res.ok) return setOutput({ ok: false, text: res.error, correct: false });
    const correct = valuesMatch(res.value, ex.grid.expected);
    if (correct) setSolved((s) => ({ ...s, [ex.id]: true }));
    setOutput({ ok: true, text: String(formatCell(res.value)), correct });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <ol className="grid content-start gap-2" aria-label="Excel challenges">
        {exercises.map((e, i) => (
          <li key={e.id}>
            <button
              type="button"
              aria-current={i === active ? "step" : undefined}
              onClick={() => {
                setActive(i);
                setFormula("");
                setOutput(null);
                setHint(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm",
                i === active ? "border-teal-500 bg-teal-50 font-semibold" : "border-line bg-white hover:bg-surface",
              )}
            >
              <span>
                {i + 1}. {e.title}
              </span>
              {solved[e.id] ? <CheckCircle2 className="size-4 shrink-0 text-leaf-500" aria-label="Solved" /> : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={levelTone(ex.level)}>{ex.level}</Badge>
          <Badge tone="amber">Sample content</Badge>
        </div>
        <h3 className="mt-2 text-lg font-bold text-navy-950">{ex.title}</h3>
        <p className="mt-1 text-sm text-navy-900">{ex.instructions.replace(/\*\*/g, "")}</p>
        <div className="mt-4">
          <FormulaGridView grid={ex.grid} caption="Monthly targets and actuals" />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="fx-input" className="mb-1.5 block text-sm font-medium">
              {ex.targetLabel} — your formula
            </label>
            <Input
              id="fx-input"
              value={formula}
              onChange={(e) => (setFormula(e.target.value), setOutput(null))}
              onKeyDown={(e) => e.key === "Enter" && evaluate()}
              placeholder="="
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <Button variant="teal" onClick={evaluate}>
            Evaluate
          </Button>
        </div>
        {output ? (
          <p
            role="status"
            className={cn(
              "mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm",
              output.correct ? "bg-leaf-50 text-leaf-800" : output.ok ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800",
            )}
          >
            {output.correct ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
            {output.ok ? (
              <>
                Result: <span className="font-mono font-semibold">{output.text}</span> — {output.correct ? "correct!" : "not the expected value yet."}
              </>
            ) : (
              output.text
            )}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setHint(true)}>
            <Lightbulb className="size-4" aria-hidden /> Hint
          </Button>
        </div>
        {hint ? (
          <p className="mt-3 rounded-xl bg-surface px-4 py-2.5 text-sm text-navy-800">
            {ex.hint}
            {solved[ex.id] ? (
              <>
                {" "}
                One solution: <code className="font-mono">{ex.solutionFormula}</code>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-muted">
          This practice tool evaluates a subset of Excel functions (SUM, SUMIF(S), COUNTIF(S), AVERAGEIF(S), IF, AND/OR, ROUND, MIN/MAX,
          MEDIAN, SUMPRODUCT, INDEX, MATCH, XLOOKUP, VLOOKUP, IFERROR and more).
        </p>
      </div>
    </div>
  );
}
