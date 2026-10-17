"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import { SubmissionGrader, type GradableSubmission } from "./grading";

export function AssignmentsInbox({ rows }: { rows: GradableSubmission[] }) {
  const [view, setView] = useState<"todo" | "graded" | "all">("todo");
  const list = rows.filter((r) => (view === "all" ? true : view === "todo" ? !r.gradedAt : Boolean(r.gradedAt)));
  const counts = { todo: rows.filter((r) => !r.gradedAt).length, graded: rows.filter((r) => r.gradedAt).length, all: rows.length };
  return (
    <div>
      <div role="tablist" aria-label="Filter submissions" className="mb-4 inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["todo", "Needs grading"],
            ["graded", "Graded"],
            ["all", "All"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", view === v ? "bg-white text-navy-950 shadow-sm" : "text-muted")}
          >
            {label} ({counts[v]})
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="grid gap-3">
          {list.map((s) => (
            <SubmissionGrader key={s.id} s={s} />
          ))}
        </ul>
      ) : (
        <EmptyState title={view === "todo" ? "Nothing waiting to be graded" : "No submissions here"} />
      )}
    </div>
  );
}
