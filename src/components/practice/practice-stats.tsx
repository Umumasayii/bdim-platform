"use client";

import { Flame, Target, Trophy } from "lucide-react";
import { useLearner } from "@/lib/learner/provider";
import { computeStreak } from "@/lib/learner/types";

export function PracticeStats({ totalFree }: { totalFree: number }) {
  const { state, ready, mode } = useLearner();
  if (!ready) return null;
  const attempts = state.attempts.length;
  const correct = state.attempts.filter((a) => a.correct).length;
  const completed = Object.keys(state.completed).length;
  const streak = computeStreak(state);
  const stats = [
    { icon: Target, label: "Attempts", value: attempts, sub: attempts ? `${Math.round((correct / attempts) * 100)}% correct` : "Start with any question" },
    { icon: Trophy, label: "Questions completed", value: completed, sub: `of ${totalFree} free questions` },
    { icon: Flame, label: "Learning streak", value: `${streak} day${streak === 1 ? "" : "s"}`, sub: "Practise daily to grow it" },
  ];
  return (
    <section aria-label="Your practice summary" className="grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
          <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-600">
            <s.icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs text-muted">{s.label}</span>
            <span className="block text-xl font-bold text-navy-950">{s.value}</span>
            <span className="block text-xs text-muted">{s.sub}</span>
          </span>
        </div>
      ))}
      {mode !== "member" ? (
        <p className="text-xs text-muted sm:col-span-3">
          {mode === "demo" ? "Practice history is saved in this browser." : "Practice history is saved in this browser until you sign in."}
        </p>
      ) : null}
    </section>
  );
}
