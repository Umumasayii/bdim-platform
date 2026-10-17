"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { CheckCircle2, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// A Power BI-style KPI page built from synthetic data, with interpretation questions.
const monthly = [
  { month: "Jan", enrolled: 420, target: 450, completion: 61 },
  { month: "Feb", enrolled: 465, target: 450, completion: 63 },
  { month: "Mar", enrolled: 510, target: 480, completion: 58 },
  { month: "Apr", enrolled: 498, target: 480, completion: 55 },
  { month: "May", enrolled: 540, target: 500, completion: 52 },
  { month: "Jun", enrolled: 575, target: 500, completion: 50 },
];
const byDistrict = [
  { district: "District A", rate: 64 },
  { district: "District B", rate: 57 },
  { district: "District C", rate: 41 },
  { district: "District D", rate: 49 },
];

const questions = [
  {
    q: "Enrolment beat target in five of six months, but completion fell from 61% to 50%. What is the most useful conclusion?",
    options: [
      "The programme is performing well overall — no action needed.",
      "Growth in enrolment may be outpacing support capacity; investigate why completion is falling.",
      "Completion fell because the target was too low.",
      "The data must be wrong because the two KPIs disagree.",
    ],
    answer: 1,
    why: "Volume and quality KPIs can move in opposite directions. A falling completion rate alongside rising enrolment is an early warning worth investigating (e.g. trainer capacity, new cohort profile).",
  },
  {
    q: "Which district should be prioritised for follow-up on completion?",
    options: ["District A", "District B", "District C", "District D"],
    answer: 2,
    why: "District C has the lowest completion rate (41%). Check its enrolment size too before allocating resources.",
  },
  {
    q: "June enrolment is 575 against a target of 500. What is the variance to target?",
    options: ["+75 (+15%)", "+15 (+75%)", "−75 (−13%)", "+575"],
    answer: 0,
    why: "575 − 500 = 75, and 75 / 500 = 15% above target.",
  },
];

export function KpiChallenge() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const latest = monthly[monthly.length - 1];
  const first = monthly[0];

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-navy-950">Skills programme — monthly KPI report</p>
          <p className="text-xs text-muted">Synthetic data for practice · Jan–Jun</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Enrolled (Jun)", value: latest.enrolled.toString(), delta: `+${latest.enrolled - latest.target} vs target`, up: true },
            { label: "Target (Jun)", value: latest.target.toString(), delta: "Monthly goal", up: null },
            { label: "Completion rate", value: `${latest.completion}%`, delta: `${latest.completion - first.completion} pts since Jan`, up: false },
            { label: "Lowest district", value: "41%", delta: "District C", up: false },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-line bg-surface p-3">
              <dt className="text-xs text-muted">{k.label}</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-navy-950">{k.value}</dd>
              <dd className={cn("mt-0.5 flex items-center gap-1 text-xs", k.up === true ? "text-leaf-700" : k.up === false ? "text-red-700" : "text-muted")}>
                {k.up === true ? <TrendingUp className="size-3.5" aria-hidden /> : k.up === false ? <TrendingDown className="size-3.5" aria-hidden /> : null}
                {k.delta}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <figure>
            <figcaption className="mb-2 text-xs font-medium text-muted">Enrolled vs target, and completion rate (%)</figcaption>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e7ee" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="enrolled" name="Enrolled" fill="#159a94" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="l" dataKey="target" name="Target" stroke="#102545" strokeDasharray="4 3" dot={false} />
                  <Line yAxisId="r" dataKey="completion" name="Completion %" stroke="#279853" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </figure>
          <figure>
            <figcaption className="mb-2 text-xs font-medium text-muted">Completion rate by district (%)</figcaption>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDistrict} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e7ee" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="rate" name="Completion %" fill="#2f5895" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>
      </div>

      <ol className="grid gap-5">
        {questions.map((item, qi) => (
          <li key={qi} className="rounded-2xl border border-line bg-white p-5">
            <fieldset>
              <legend className="font-medium text-navy-950">
                {qi + 1}. {item.q}
              </legend>
              <div className="mt-3 grid gap-2">
                {item.options.map((o, oi) => (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
                      answers[qi] === oi ? "border-teal-500 bg-teal-50" : "border-line hover:bg-surface",
                      checked && oi === item.answer && "border-leaf-500 bg-leaf-50",
                    )}
                  >
                    <input
                      type="radio"
                      name={`kpi-${qi}`}
                      className="accent-teal-600"
                      checked={answers[qi] === oi}
                      onChange={() => (setAnswers((a) => ({ ...a, [qi]: oi })), setChecked(false))}
                    />
                    {o}
                  </label>
                ))}
              </div>
              {checked ? (
                <p className={cn("mt-2 flex items-start gap-2 text-sm", answers[qi] === item.answer ? "text-leaf-700" : "text-amber-800")}>
                  {answers[qi] === item.answer ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
                  {item.why}
                </p>
              ) : null}
            </fieldset>
          </li>
        ))}
      </ol>
      <div>
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="inline-flex h-11 items-center rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Check my interpretation
        </button>
        {checked ? (
          <span role="status" className="ml-3 text-sm font-medium text-navy-900">
            {questions.filter((q, i) => answers[i] === q.answer).length}/{questions.length} correct
          </span>
        ) : null}
      </div>
    </div>
  );
}
