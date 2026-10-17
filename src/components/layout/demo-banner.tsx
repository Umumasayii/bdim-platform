"use client";

import { useLearner } from "@/lib/learner/provider";

/** Shown in a learner's first visit context only when accounts aren't configured. */
export function DemoModeBanner() {
  const { mode, ready, error, clearError } = useLearner();
  return (
    <>
      {ready && mode === "demo" ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Demo mode: accounts are not configured yet, so your progress is saved in this browser only.
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800">
          {error}{" "}
          <button type="button" onClick={clearError} className="ml-2 font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
