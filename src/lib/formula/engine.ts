/*
  A small, dependency-free spreadsheet formula evaluator for practice
  exercises. Supports A1 references and ranges, arithmetic, comparison,
  concatenation (&), element-wise array maths, and common Excel functions.
  It is intentionally limited — it is not a full Excel implementation.
*/
import type { CellValue } from "@/lib/types";

type Matrix = CellValue[][];
type Value = CellValue | Matrix;

export class FormulaError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; v: string }
  | { t: "range"; a: string; b: string }
  | { t: "fn"; v: string }
  | { t: "op"; v: string }
  | { t: "("; }
  | { t: ")"; }
  | { t: ","; };

function tokenize(src: string): Token[] {
  const s = src.trim().replace(/^=/, "");
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let str = "";
      while (j < s.length) {
        if (s[j] === '"' && s[j + 1] === '"') {
          str += '"';
          j += 2;
        } else if (s[j] === '"') break;
        else str += s[j++];
      }
      if (s[j] !== '"') throw new FormulaError("#ERROR", "Unclosed text string");
      out.push({ t: "str", v: str });
      i = j + 1;
      continue;
    }
    const num = /^\d+(\.\d+)?(e[+-]?\d+)?%?/i.exec(s.slice(i));
    if (num && !/^[A-Z]/i.test(c)) {
      let v = parseFloat(num[0]);
      if (num[0].endsWith("%")) v /= 100;
      out.push({ t: "num", v });
      i += num[0].length;
      continue;
    }
    const range = /^\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)/i.exec(s.slice(i));
    if (range) {
      out.push({ t: "range", a: `${range[1]}${range[2]}`.toUpperCase(), b: `${range[3]}${range[4]}`.toUpperCase() });
      i += range[0].length;
      continue;
    }
    const word = /^[A-Z_][A-Z0-9_.]*/i.exec(s.slice(i));
    if (word) {
      const w = word[0].toUpperCase();
      const after = s.slice(i + word[0].length).trimStart();
      if (after.startsWith("(")) out.push({ t: "fn", v: w });
      else if (w === "TRUE" || w === "FALSE") out.push({ t: "bool", v: w === "TRUE" });
      else if (/^\$?[A-Z]{1,3}\$?\d+$/.test(w)) out.push({ t: "ref", v: w.replace(/\$/g, "") });
      else throw new FormulaError("#NAME?", `Unknown name ${word[0]}`);
      i += word[0].length;
      continue;
    }
    if (/^\$[A-Z]/i.test(s.slice(i))) {
      const ref = /^\$?[A-Z]{1,3}\$?\d+/i.exec(s.slice(i));
      if (ref) {
        out.push({ t: "ref", v: ref[0].replace(/\$/g, "").toUpperCase() });
        i += ref[0].length;
        continue;
      }
    }
    const two = s.slice(i, i + 2);
    if (["<=", ">=", "<>"].includes(two)) {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      out.push({ t: c } as Token);
      i++;
      continue;
    }
    if (c === ";") {
      out.push({ t: "," });
      i++;
      continue;
    }
    throw new FormulaError("#ERROR", `Unexpected character "${c}"`);
  }
  return out;
}

// ── helpers ──
const colToNum = (col: string) => col.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const numToCol = (n: number) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const splitRef = (ref: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
  return { col: colToNum(m[1]), row: Number(m[2]) };
};

const isMatrix = (v: Value): v is Matrix => Array.isArray(v);
const flat = (v: Value): CellValue[] => (isMatrix(v) ? v.flat() : [v]);
const toNum = (v: CellValue): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === "") return 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw new FormulaError("#VALUE!", `"${v}" is not a number`);
  return n;
};
const scalar = (v: Value): CellValue => {
  if (!isMatrix(v)) return v;
  if (v.length === 1 && v[0].length === 1) return v[0][0];
  throw new FormulaError("#VALUE!", "Expected a single value, got a range");
};
const truthy = (v: CellValue) => (typeof v === "string" ? v.length > 0 && v.toUpperCase() !== "FALSE" : Boolean(v));
const numbersOnly = (vals: CellValue[]) => vals.filter((x): x is number => typeof x === "number");

function compare(a: CellValue, b: CellValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a ?? "").toLowerCase();
  const sb = String(b ?? "").toLowerCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function matchesCriteria(value: CellValue, criteria: CellValue): boolean {
  if (typeof criteria === "number" || typeof criteria === "boolean") return compare(value, criteria) === 0;
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(String(criteria ?? ""))!;
  const op = m[1] ?? "=";
  const raw = m[2];
  const asNum = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : null;
  if (asNum !== null && typeof value === "number") {
    const d = value - asNum;
    return op === "=" ? d === 0 : op === "<>" ? d !== 0 : op === "<" ? d < 0 : op === ">" ? d > 0 : op === "<=" ? d <= 0 : d >= 0;
  }
  if (op === "=" || op === "<>") {
    const pattern = new RegExp(
      `^${raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`,
      "i",
    );
    const hit = pattern.test(String(value ?? ""));
    return op === "=" ? hit : !hit;
  }
  if (asNum === null) {
    const d = compare(value, raw);
    return op === "<" ? d < 0 : op === ">" ? d > 0 : op === "<=" ? d <= 0 : d >= 0;
  }
  return false;
}

function elementwise(a: Value, b: Value, fn: (x: CellValue, y: CellValue) => CellValue): Value {
  if (!isMatrix(a) && !isMatrix(b)) return fn(a, b);
  const A = isMatrix(a) ? a : null;
  const B = isMatrix(b) ? b : null;
  const rows = Math.max(A?.length ?? 1, B?.length ?? 1);
  const cols = Math.max(A?.[0]?.length ?? 1, B?.[0]?.length ?? 1);
  if ((A && (A.length !== rows || A[0].length !== cols) && !(A.length === 1 && A[0].length === 1)) ||
      (B && (B.length !== rows || B[0].length !== cols) && !(B.length === 1 && B[0].length === 1))) {
    throw new FormulaError("#VALUE!", "Ranges must be the same size");
  }
  const get = (m: Matrix | null, s: Value, r: number, c: number) => (m ? (m.length === 1 && m[0].length === 1 ? m[0][0] : m[r][c]) : (s as CellValue));
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => fn(get(A, a, r, c), get(B, b, r, c))));
}

function pairsFor(args: Value[], startIndex: number) {
  const pairs: { range: CellValue[]; criteria: CellValue }[] = [];
  for (let i = startIndex; i + 1 < args.length; i += 2) pairs.push({ range: flat(args[i]), criteria: scalar(args[i + 1]) });
  return pairs;
}

function maskFor(pairs: { range: CellValue[]; criteria: CellValue }[], length: number) {
  return Array.from({ length }, (_, i) => pairs.every((p) => matchesCriteria(p.range[i], p.criteria)));
}

const functions: Record<string, (args: Value[]) => Value> = {
  SUM: (a) => numbersOnly(a.flatMap(flat)).reduce((n, v) => n + v, 0),
  AVERAGE: (a) => {
    const nums = numbersOnly(a.flatMap(flat));
    if (!nums.length) throw new FormulaError("#DIV/0!");
    return nums.reduce((n, v) => n + v, 0) / nums.length;
  },
  COUNT: (a) => numbersOnly(a.flatMap(flat)).length,
  COUNTA: (a) => a.flatMap(flat).filter((v) => v !== null && v !== "").length,
  MIN: (a) => Math.min(...numbersOnly(a.flatMap(flat))),
  MAX: (a) => Math.max(...numbersOnly(a.flatMap(flat))),
  MEDIAN: (a) => {
    const nums = numbersOnly(a.flatMap(flat)).sort((x, y) => x - y);
    if (!nums.length) throw new FormulaError("#NUM!");
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  },
  ROUND: (a) => {
    const d = toNum(scalar(a[1] ?? 0));
    const f = 10 ** d;
    return Math.round(toNum(scalar(a[0])) * f + Number.EPSILON) / f;
  },
  ABS: (a) => Math.abs(toNum(scalar(a[0]))),
  IF: (a) => (truthy(scalar(a[0])) ? (a[1] ?? true) : (a[2] ?? false)),
  IFERROR: (a) => a[0],
  AND: (a) => a.flatMap(flat).every(truthy),
  OR: (a) => a.flatMap(flat).some(truthy),
  NOT: (a) => !truthy(scalar(a[0])),
  LEN: (a) => String(scalar(a[0]) ?? "").length,
  UPPER: (a) => String(scalar(a[0]) ?? "").toUpperCase(),
  LOWER: (a) => String(scalar(a[0]) ?? "").toLowerCase(),
  CONCAT: (a) => a.flatMap(flat).map((v) => String(v ?? "")).join(""),
  SUMIF: (a) => {
    const range = flat(a[0]);
    const sumRange = flat(a[2] ?? a[0]);
    return range.reduce<number>((n, v, i) => (matchesCriteria(v, scalar(a[1])) && typeof sumRange[i] === "number" ? n + (sumRange[i] as number) : n), 0);
  },
  SUMIFS: (a) => {
    const sumRange = flat(a[0]);
    const mask = maskFor(pairsFor(a, 1), sumRange.length);
    return sumRange.reduce<number>((n, v, i) => (mask[i] && typeof v === "number" ? n + v : n), 0);
  },
  COUNTIF: (a) => flat(a[0]).filter((v) => matchesCriteria(v, scalar(a[1]))).length,
  COUNTIFS: (a) => {
    const len = flat(a[0]).length;
    return maskFor(pairsFor(a, 0), len).filter(Boolean).length;
  },
  AVERAGEIF: (a) => {
    const range = flat(a[0]);
    const avgRange = flat(a[2] ?? a[0]);
    const nums = range.flatMap((v, i) => (matchesCriteria(v, scalar(a[1])) && typeof avgRange[i] === "number" ? [avgRange[i] as number] : []));
    if (!nums.length) throw new FormulaError("#DIV/0!");
    return nums.reduce((n, v) => n + v, 0) / nums.length;
  },
  AVERAGEIFS: (a) => {
    const avgRange = flat(a[0]);
    const mask = maskFor(pairsFor(a, 1), avgRange.length);
    const nums = avgRange.filter((v, i): v is number => mask[i] && typeof v === "number");
    if (!nums.length) throw new FormulaError("#DIV/0!");
    return nums.reduce((n, v) => n + v, 0) / nums.length;
  },
  SUMPRODUCT: (a) => {
    const arrays = a.map(flat);
    const len = arrays[0]?.length ?? 0;
    if (arrays.some((x) => x.length !== len)) throw new FormulaError("#VALUE!", "SUMPRODUCT ranges must be the same size");
    let total = 0;
    for (let i = 0; i < len; i++) total += arrays.reduce((p, arr) => p * toNum(arr[i]), 1);
    return total;
  },
  MATCH: (a) => {
    const target = scalar(a[0]);
    const list = flat(a[1]);
    const type = a[2] === undefined ? 1 : toNum(scalar(a[2]));
    if (type === 0) {
      const i = list.findIndex((v) => compare(v, target) === 0);
      if (i === -1) throw new FormulaError("#N/A");
      return i + 1;
    }
    let best = -1;
    list.forEach((v, i) => {
      if (type === 1 ? compare(v, target) <= 0 : compare(v, target) >= 0) best = i;
    });
    if (best === -1) throw new FormulaError("#N/A");
    return best + 1;
  },
  INDEX: (a) => {
    const m = isMatrix(a[0]) ? a[0] : [[a[0]]];
    const r = toNum(scalar(a[1]));
    const c = a[2] === undefined ? 1 : toNum(scalar(a[2]));
    const asColumn = m[0].length === 1;
    const row = asColumn ? r : m.length === 1 ? 1 : r;
    const col = asColumn ? 1 : m.length === 1 ? r : c;
    const v = m[row - 1]?.[col - 1];
    if (v === undefined) throw new FormulaError("#REF!");
    return v;
  },
  XLOOKUP: (a) => {
    const target = scalar(a[0]);
    const look = flat(a[1]);
    const ret = flat(a[2]);
    const i = look.findIndex((v) => compare(v, target) === 0);
    if (i === -1) {
      if (a[3] !== undefined) return a[3];
      throw new FormulaError("#N/A");
    }
    return ret[i];
  },
  VLOOKUP: (a) => {
    const target = scalar(a[0]);
    const table = a[1] as Matrix;
    const col = toNum(scalar(a[2]));
    const exact = a[3] !== undefined && !truthy(scalar(a[3]));
    const row = exact ? table.find((r) => compare(r[0], target) === 0) : [...table].reverse().find((r) => compare(r[0], target) <= 0);
    if (!row) throw new FormulaError("#N/A");
    return row[col - 1];
  },
};

// ── recursive-descent parser/evaluator ──
class Evaluator {
  private i = 0;
  constructor(private tokens: Token[], private cells: Record<string, CellValue>) {}

  run(): Value {
    const v = this.comparison();
    if (this.i < this.tokens.length) throw new FormulaError("#ERROR", "Unexpected input after formula");
    return v;
  }
  private peek() {
    return this.tokens[this.i];
  }
  private isOp(...ops: string[]) {
    const t = this.peek();
    return t?.t === "op" && ops.includes(t.v);
  }
  private comparison(): Value {
    let left = this.concat();
    while (this.isOp("=", "<>", "<", ">", "<=", ">=")) {
      const op = (this.tokens[this.i++] as { v: string }).v;
      const right = this.concat();
      left = elementwise(left, right, (x, y) => {
        const d = compare(x, y);
        return op === "=" ? d === 0 : op === "<>" ? d !== 0 : op === "<" ? d < 0 : op === ">" ? d > 0 : op === "<=" ? d <= 0 : d >= 0;
      });
    }
    return left;
  }
  private concat(): Value {
    let left = this.additive();
    while (this.isOp("&")) {
      this.i++;
      const right = this.additive();
      left = elementwise(left, right, (x, y) => `${x ?? ""}${y ?? ""}`);
    }
    return left;
  }
  private additive(): Value {
    let left = this.multiplicative();
    while (this.isOp("+", "-")) {
      const op = (this.tokens[this.i++] as { v: string }).v;
      const right = this.multiplicative();
      left = elementwise(left, right, (x, y) => (op === "+" ? toNum(x) + toNum(y) : toNum(x) - toNum(y)));
    }
    return left;
  }
  private multiplicative(): Value {
    let left = this.power();
    while (this.isOp("*", "/")) {
      const op = (this.tokens[this.i++] as { v: string }).v;
      const right = this.power();
      left = elementwise(left, right, (x, y) => {
        if (op === "*") return toNum(x) * toNum(y);
        if (toNum(y) === 0) throw new FormulaError("#DIV/0!");
        return toNum(x) / toNum(y);
      });
    }
    return left;
  }
  private power(): Value {
    let left = this.unary();
    while (this.isOp("^")) {
      this.i++;
      const right = this.unary();
      left = elementwise(left, right, (x, y) => toNum(x) ** toNum(y));
    }
    return left;
  }
  private unary(): Value {
    if (this.isOp("-")) {
      this.i++;
      return elementwise(this.unary(), 0, (x) => -toNum(x));
    }
    if (this.isOp("+")) {
      this.i++;
      return this.unary();
    }
    return this.primary();
  }
  private primary(): Value {
    const t = this.tokens[this.i++];
    if (!t) throw new FormulaError("#ERROR", "Formula ended unexpectedly");
    switch (t.t) {
      case "num":
      case "str":
      case "bool":
        return t.v;
      case "ref":
        return this.cells[t.v] ?? null;
      case "range":
        return this.range(t.a, t.b);
      case "(": {
        const v = this.comparison();
        if (this.tokens[this.i++]?.t !== ")") throw new FormulaError("#ERROR", "Missing closing parenthesis");
        return v;
      }
      case "fn":
        return this.call(t.v);
      default:
        throw new FormulaError("#ERROR", "Unexpected token");
    }
  }
  private call(name: string): Value {
    const fn = functions[name];
    if (!fn) throw new FormulaError("#NAME?", `${name} is not supported in this practice tool`);
    this.i++; // (
    const args: Value[] = [];
    if (this.peek()?.t !== ")") {
      for (;;) {
        if (name === "IFERROR" && args.length === 0) {
          const start = this.i;
          try {
            args.push(this.comparison());
          } catch (err) {
            if (!(err instanceof FormulaError)) throw err;
            // skip to the comma at this depth, evaluate the fallback instead
            this.i = start;
            let depth = 0;
            while (this.i < this.tokens.length) {
              const tk = this.tokens[this.i];
              if (tk.t === "(") depth++;
              if (tk.t === ")") depth--;
              if (tk.t === "," && depth === 0) break;
              this.i++;
            }
            this.i++;
            const fallback = this.comparison();
            if (this.tokens[this.i++]?.t !== ")") throw new FormulaError("#ERROR", "Missing closing parenthesis");
            return fallback;
          }
        } else args.push(this.comparison());
        if (this.peek()?.t === ",") {
          this.i++;
          continue;
        }
        break;
      }
    }
    if (this.tokens[this.i++]?.t !== ")") throw new FormulaError("#ERROR", `Missing ")" after ${name} arguments`);
    return fn(args);
  }
  private range(a: string, b: string): Matrix {
    const s = splitRef(a);
    const e = splitRef(b);
    const rows: Matrix = [];
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
      const row: CellValue[] = [];
      for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) row.push(this.cells[`${numToCol(c)}${r}`] ?? null);
      rows.push(row);
    }
    return rows;
  }
}

export type FormulaResult = { ok: true; value: CellValue } | { ok: false; error: string };

export function evaluateFormula(formula: string, cells: Record<string, CellValue>): FormulaResult {
  try {
    if (!formula.trim().startsWith("=")) return { ok: false, error: "Formulas start with =" };
    const v = new Evaluator(tokenize(formula), cells).run();
    return { ok: true, value: isMatrix(v) ? (v[0]?.[0] ?? null) : v };
  } catch (err) {
    if (err instanceof FormulaError) return { ok: false, error: err.code === err.message ? err.code : `${err.code} — ${err.message}` };
    return { ok: false, error: "Could not evaluate this formula" };
  }
}

export function valuesMatch(actual: CellValue, expected: CellValue) {
  if (typeof expected === "number") return typeof actual === "number" && Math.abs(actual - expected) < 1e-6 * Math.max(1, Math.abs(expected));
  return String(actual ?? "").trim().toLowerCase() === String(expected ?? "").trim().toLowerCase();
}

export function formatCell(v: CellValue) {
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString("en-GB") : v.toLocaleString("en-GB", { maximumFractionDigits: 4 });
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return v ?? "";
}
