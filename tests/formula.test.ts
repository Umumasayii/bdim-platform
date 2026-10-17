import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormula, valuesMatch } from "../src/lib/formula/engine";
import { seedQuestions } from "../src/content/questions";
import { formulaExercises } from "../src/content/exercises";

test("every accepted answer to a formula question evaluates to the expected value", () => {
  for (const q of seedQuestions.filter((x) => x.type === "formula")) {
    for (const f of q.answer as string[]) {
      const r = evaluateFormula(f, q.formulaGrid!.cells);
      assert.ok(r.ok, `${q.slug}: ${f} -> ${JSON.stringify(r)}`);
      assert.ok(valuesMatch(r.value, q.formulaGrid!.expected), `${q.slug}: ${f} gave ${r.value}`);
    }
  }
});

test("every formula exercise solution evaluates to the expected value", () => {
  for (const e of formulaExercises) {
    const r = evaluateFormula(e.solutionFormula, e.grid.cells);
    assert.ok(r.ok && valuesMatch(r.value, e.grid.expected), `${e.id}: ${JSON.stringify(r)}`);
  }
});

test("supported functions and operators", () => {
  const cells = formulaExercises[0].grid.cells;
  const cases: [string, unknown][] = [
    ['=XLOOKUP("May",A2:A7,C2:C7)', 640],
    ['=VLOOKUP("Mar",A2:C7,3,FALSE)', 610],
    ['=IFERROR(1/0,"x")', "x"],
    ["=MEDIAN(C2:C7)", 560],
    ['=COUNTIFS(D2:D7,"Kigali",C2:C7,">500")', 2],
    ['="a"&"b"', "ab"],
    ["=2^3+-1", 7],
    ["=$C$2+C3", 1000],
    ["=ROUND(2/3,2)", 0.67],
  ];
  for (const [f, expected] of cases) {
    const r = evaluateFormula(f, cells);
    assert.ok(r.ok, `${f}: ${JSON.stringify(r)}`);
    assert.deepEqual(r.value, expected, f);
  }
  assert.equal(evaluateFormula("=SUM(C2:C7)/0", cells).ok, false);
  assert.equal(evaluateFormula("SUM(C2:C7)", cells).ok, false);
  assert.equal(evaluateFormula("=FOO(1)", cells).ok, false);
});
