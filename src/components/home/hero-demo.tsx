"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Small synthetic dataset analysed live in the browser.
const rows = [
  { month: "Jan", region: "North", product: "Maize flour", revenue: 4.2 },
  { month: "Jan", region: "South", product: "Beans", revenue: 3.1 },
  { month: "Feb", region: "North", product: "Beans", revenue: 3.6 },
  { month: "Feb", region: "South", product: "Maize flour", revenue: 3.4 },
  { month: "Mar", region: "North", product: "Rice", revenue: 4.9 },
  { month: "Mar", region: "South", product: "Rice", revenue: 3.0 },
  { month: "Apr", region: "North", product: "Maize flour", revenue: 5.3 },
  { month: "Apr", region: "South", product: "Beans", revenue: 2.7 },
  { month: "May", region: "North", product: "Rice", revenue: 5.8 },
  { month: "May", region: "South", product: "Maize flour", revenue: 3.2 },
  { month: "Jun", region: "North", product: "Beans", revenue: 6.1 },
  { month: "Jun", region: "South", product: "Rice", revenue: 2.9 },
];

type Key = "region" | "month" | "product";

const questions: { id: Key; label: string }[] = [
  { id: "region", label: "Which region sells most?" },
  { id: "month", label: "Is revenue growing?" },
  { id: "product", label: "Which product leads?" },
];

const sqlFor = (k: Key) =>
  `SELECT ${k}, SUM(revenue) AS total\nFROM cooperative_sales\nGROUP BY ${k}\nORDER BY ${k === "month" ? "month_no" : "total DESC"};`;

function aggregate(k: Key) {
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r[k], (map.get(r[k]) ?? 0) + r.revenue));
  const list = [...map.entries()].map(([label, total]) => ({ label, total: Math.round(total * 10) / 10 }));
  return k === "month" ? list : list.sort((a, b) => b.total - a.total);
}

function insight(k: Key, data: { label: string; total: number }[]) {
  const sum = data.reduce((n, d) => n + d.total, 0);
  if (k === "month") {
    const first = data[0].total;
    const last = data[data.length - 1].total;
    const change = Math.round(((last - first) / first) * 100);
    return `Monthly revenue moved from ${first}M to ${last}M RWF (${change >= 0 ? "+" : ""}${change}%). Next question: is growth coming from one region?`;
  }
  const top = data[0];
  const share = Math.round((top.total / sum) * 100);
  return k === "region"
    ? `${top.label} generated ${share}% of revenue. Decision: investigate what is holding back the other region before setting next quarter's targets.`
    : `${top.label} leads with ${top.total}M RWF (${share}% of total). Decision: check stock levels for ${top.label.toLowerCase()} ahead of peak months.`;
}

/** Types the query out; re-mounted (via key) whenever the query changes. */
function TypedSql({ sql, onDone }: { sql: string; onDone: () => void }) {
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduce ? sql.length : 2;
    let count = 0;
    const id = window.setInterval(() => {
      count = Math.min(sql.length, count + step);
      setTyped(count);
      if (count >= sql.length) {
        window.clearInterval(id);
        onDone();
      }
    }, reduce ? 0 : 18);
    return () => window.clearInterval(id);
  }, [sql, onDone]);
  return <code className={cn(typed < sql.length && "caret")}>{sql.slice(0, typed)}</code>;
}

export function HeroDemo() {
  const [question, setQuestion] = useState<Key>("region");
  const [doneFor, setDoneFor] = useState<Key | null>(null);
  const [ran, setRan] = useState(false);
  const sql = sqlFor(question);
  const data = useMemo(() => aggregate(question), [question]);
  const max = Math.max(...data.map((d) => d.total));
  const markDone = useCallback(() => setDoneFor(question), [question]);
  const done = doneFor === question;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-700/40 bg-navy-950 text-white shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
        </div>
        <p className="text-xs font-medium text-navy-200">analysis.sql · cooperative_sales (12 rows)</p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-3" role="group" aria-label="Choose a business question">
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            aria-pressed={question === q.id}
            onClick={() => {
              setQuestion(q.id);
              setRan(false);
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              question === q.id ? "bg-teal-500 text-navy-950" : "bg-white/5 text-navy-100 hover:bg-white/10",
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      <pre className="min-h-[7.5rem] px-4 py-4 font-mono text-[13px] leading-relaxed text-teal-100" aria-label="SQL query">
        <TypedSql key={sql} sql={sql} onDone={markDone} />
      </pre>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-[11px] text-navy-300">Calculated live in your browser · synthetic data</p>
        <button
          type="button"
          onClick={() => setRan(true)}
          disabled={!done}
          className="inline-flex items-center gap-1.5 rounded-lg bg-leaf-500 px-3 py-1.5 text-xs font-semibold text-navy-950 transition hover:bg-leaf-400 disabled:opacity-40"
        >
          <Play className="size-3.5" aria-hidden /> Run analysis
        </button>
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] px-4 py-4" aria-live="polite">
        {ran ? (
          <div className="animate-rise">
            <ul className="grid gap-2">
              {data.map((d) => (
                <li key={d.label} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-xs">
                  <span className="truncate text-navy-100">{d.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-gradient-to-r from-teal-400 to-leaf-400" style={{ width: `${(d.total / max) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-navy-100">{d.total}M</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex gap-2 rounded-lg bg-teal-500/10 p-3 text-xs leading-relaxed text-teal-50">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-teal-300" aria-hidden />
              <span>
                <strong className="font-semibold text-white">Insight: </strong>
                {insight(question, data)}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-navy-300">Pick a question, then run the analysis to turn rows into a decision.</p>
        )}
      </div>
    </div>
  );
}
