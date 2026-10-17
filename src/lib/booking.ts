import type { BookingSettings } from "@/lib/types";
import { offsetToMinutes } from "@/lib/utils";

export interface Slot {
  startsAt: string;
  endsAt: string;
  label: string;
}

export interface SlotDay {
  date: string;
  label: string;
  slots: Slot[];
}

/**
 * Generate bookable slots from the weekly schedule, removing slots that are
 * inside the lead time, on blackout dates, or overlap an active booking.
 * The business time zone is a fixed UTC offset (Rwanda has no DST).
 */
export function computeSlots(params: {
  settings: BookingSettings;
  durationMinutes: number;
  instructorId: string;
  busy: { startsAt: string; endsAt: string; instructorId: string }[];
  nowMs: number;
}): SlotDay[] {
  const { settings, durationMinutes, instructorId, busy, nowMs } = params;
  if (!settings.enabled) return [];
  const offsetMin = offsetToMinutes(settings.utcOffset);
  const earliest = nowMs + settings.leadTimeHours * 3_600_000;
  const busyForInstructor = busy
    .filter((b) => b.instructorId === instructorId)
    .map((b) => [Date.parse(b.startsAt), Date.parse(b.endsAt)] as const);

  // "Local midnight" today in the business zone, expressed in UTC ms.
  const localNow = new Date(nowMs + offsetMin * 60_000);
  const todayLocalUtcMs = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate());

  const days: SlotDay[] = [];
  for (let d = 0; d <= settings.horizonDays; d++) {
    const dayUtc = new Date(todayLocalUtcMs + d * 86_400_000);
    const date = dayUtc.toISOString().slice(0, 10);
    if (settings.blackoutDates.includes(date)) continue;
    const windows = settings.weekly[String(dayUtc.getUTCDay())] ?? [];
    const slots: Slot[] = [];
    for (const w of windows) {
      const [sh, sm] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      // local wall-clock -> UTC: subtract the offset
      let start = dayUtc.getTime() + (sh * 60 + sm - offsetMin) * 60_000;
      const windowEnd = dayUtc.getTime() + (eh * 60 + em - offsetMin) * 60_000;
      while (start + durationMinutes * 60_000 <= windowEnd) {
        const end = start + durationMinutes * 60_000;
        const clash = busyForInstructor.some(([bs, be]) => start < be && bs < end);
        if (start >= earliest && !clash) {
          const local = new Date(start + offsetMin * 60_000);
          slots.push({
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(end).toISOString(),
            label: local.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
          });
        }
        start = end;
      }
    }
    if (slots.length) {
      days.push({
        date,
        label: dayUtc.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
        slots,
      });
    }
  }
  return days;
}
