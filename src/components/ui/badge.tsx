import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "navy" | "teal" | "green" | "amber" | "gray" | "red";

const tones: Record<Tone, string> = {
  navy: "bg-navy-50 text-navy-700 ring-navy-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  green: "bg-leaf-50 text-leaf-700 ring-leaf-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  gray: "bg-surface-2 text-muted ring-line",
  red: "bg-red-50 text-red-700 ring-red-100",
};

export function Badge({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function levelTone(level: string): Tone {
  return level === "Beginner" ? "green" : level === "Intermediate" ? "teal" : "navy";
}
