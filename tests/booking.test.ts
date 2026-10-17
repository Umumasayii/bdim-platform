import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots } from "../src/lib/booking";
import type { BookingSettings } from "../src/lib/types";

const settings: BookingSettings = {
  enabled: true,
  utcOffset: "+02:00",
  timeZoneLabel: "Kigali",
  weekly: { "1": [{ start: "09:00", end: "12:00" }] }, // Mondays only
  blackoutDates: [],
  leadTimeHours: 24,
  horizonDays: 14,
  autoConfirm: false,
  reviewed: true,
};
// Thursday 2026-10-15 10:00 UTC
const now = Date.parse("2026-10-15T10:00:00Z");

test("slots follow the weekly schedule in Kigali time", () => {
  const days = computeSlots({ settings, durationMinutes: 60, instructorId: "a", busy: [], nowMs: now });
  assert.equal(days[0].date, "2026-10-19"); // next Monday
  assert.deepEqual(
    days[0].slots.map((s) => s.label),
    ["09:00", "10:00", "11:00"],
  );
  // 09:00 Kigali (UTC+2) = 07:00 UTC
  assert.equal(days[0].slots[0].startsAt, "2026-10-19T07:00:00.000Z");
});

test("busy intervals, lead time and blackout dates remove slots", () => {
  const busy = [{ startsAt: "2026-10-19T08:00:00.000Z", endsAt: "2026-10-19T09:00:00.000Z", instructorId: "a" }];
  const days = computeSlots({ settings, durationMinutes: 60, instructorId: "a", busy, nowMs: now });
  assert.deepEqual(days[0].slots.map((s) => s.label), ["09:00", "11:00"]);
  // Another instructor's booking doesn't block this one
  const other = computeSlots({ settings, durationMinutes: 60, instructorId: "b", busy, nowMs: now });
  assert.equal(other[0].slots.length, 3);
  const blackout = computeSlots({ settings: { ...settings, blackoutDates: ["2026-10-19"] }, durationMinutes: 60, instructorId: "a", busy: [], nowMs: now });
  assert.equal(blackout[0].date, "2026-10-26");
  const soon = computeSlots({ settings, durationMinutes: 60, instructorId: "a", busy: [], nowMs: Date.parse("2026-10-18T09:30:00Z") });
  assert.ok(!soon.some((d) => d.slots.some((s) => Date.parse(s.startsAt) < Date.parse("2026-10-19T09:30:00Z"))), "lead time respected");
});

test("closed booking returns no slots and long sessions fit inside windows", () => {
  assert.deepEqual(computeSlots({ settings: { ...settings, enabled: false }, durationMinutes: 60, instructorId: "a", busy: [], nowMs: now }), []);
  const long = computeSlots({ settings, durationMinutes: 90, instructorId: "a", busy: [], nowMs: now });
  assert.deepEqual(long[0].slots.map((s) => s.label), ["09:00", "10:30"]);
});
