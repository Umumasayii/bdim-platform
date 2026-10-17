"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminResult } from "@/app/actions/admin";
import { Notice } from "@/components/ui/notice";

/** Runs an admin Server Action, shows the outcome, and refreshes server data. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);
  function run(fn: () => Promise<AdminResult>, onOk?: () => void) {
    startTransition(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) {
        onOk?.();
        router.refresh();
      }
    });
  }
  const message = result ? (
    <Notice tone={result.ok ? "success" : "error"} className="mb-4">
      {result.message}
      {!result.ok && result.errors ? (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {Object.entries(result.errors)
            .slice(0, 8)
            .map(([k, v]) => (
              <li key={k}>
                <code>{k}</code>: {v}
              </li>
            ))}
        </ul>
      ) : null}
    </Notice>
  ) : null;
  return { run, pending, message, clear: () => setResult(null) };
}

export function lines(value: string[]) {
  return value.join("\n");
}

export function toLines(value: string) {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
