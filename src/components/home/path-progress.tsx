"use client";

import { useLearner } from "@/lib/learner/provider";
import { ProgressBar } from "@/components/ui/card";

/** Share of a set of lessons this learner has completed (browser or account data). */
export function LessonsProgress({ lessonIds, label }: { lessonIds: string[]; label: string }) {
  const { state, ready } = useLearner();
  const done = lessonIds.filter((id) => state.lessonsCompleted[id]).length;
  const pct = lessonIds.length ? (done / lessonIds.length) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-muted">
        <span>Your progress</span>
        <span>{ready ? `${done}/${lessonIds.length} lessons` : "—"}</span>
      </div>
      <ProgressBar value={ready ? pct : 0} label={label} />
    </div>
  );
}
