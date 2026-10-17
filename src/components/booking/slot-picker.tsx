"use client";

import { useState } from "react";
import type { SlotDay } from "@/lib/booking";
import { cn } from "@/lib/utils";

export function SlotPicker({
  days,
  value,
  onChange,
  timeZoneLabel,
}: {
  days: SlotDay[];
  value: string;
  onChange: (startsAt: string) => void;
  timeZoneLabel: string;
}) {
  const [dayIndex, setDayIndex] = useState(() => Math.max(0, days.findIndex((d) => d.slots.some((s) => s.startsAt === value))));
  const day = days[dayIndex];
  if (!days.length) {
    return <p className="rounded-xl bg-surface p-4 text-sm text-muted">No times are available in the booking window. Please send a request instead and we will propose a time.</p>;
  }
  return (
    <div>
      <p className="mb-2 text-xs text-muted">Times shown in {timeZoneLabel}</p>
      <div role="tablist" aria-label="Choose a day" className="flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => (
          <button
            key={d.date}
            role="tab"
            type="button"
            aria-selected={i === dayIndex}
            onClick={() => setDayIndex(i)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-sm font-medium",
              i === dayIndex ? "border-teal-500 bg-teal-50 text-navy-950" : "border-line bg-white text-navy-800 hover:bg-surface",
            )}
          >
            {d.label}
            <span className="block text-[11px] font-normal text-muted">{d.slots.length} slots</span>
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={`Times on ${day.label}`} className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {day.slots.map((s) => (
          <button
            key={s.startsAt}
            type="button"
            role="radio"
            aria-checked={value === s.startsAt}
            onClick={() => onChange(s.startsAt)}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm font-semibold tabular-nums",
              value === s.startsAt ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-navy-900 hover:border-teal-400",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
