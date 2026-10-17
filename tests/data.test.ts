// Run with --conditions=react-server so "server-only" imports resolve (see package.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { seedCourses } from "../src/content/courses";
import { seedQuestions } from "../src/content/questions";
import { careerGoals, seedPaths } from "../src/content/paths";
import { labExercises } from "../src/content/exercises";
import { toPublicCourse } from "../src/lib/data/sanitize";
import { bookingSchema, courseSchema, inquirySchema, questionSchema, testimonialSchema } from "../src/lib/validation";
import type { Booking } from "../src/lib/types";

const dir = mkdtempSync(path.join(tmpdir(), "bdim-test-"));
process.env.BDIM_DATA_DIR = dir;

test("public course data never contains quiz answers or lesson bodies", () => {
  for (const c of seedCourses) {
    const pub = toPublicCourse(c);
    for (const m of pub.modules) {
      for (const l of m.lessons) assert.ok(!l.content, `${l.id} leaked content`);
      for (const q of m.quiz?.questions ?? []) {
        assert.equal(q.answerIndex, undefined, `${m.quiz!.id} leaked an answer`);
        assert.equal(q.explanation, undefined);
      }
    }
  }
});

test("seed content is internally consistent", () => {
  const slugs = new Set(seedCourses.map((c) => c.slug));
  const qSlugs = new Set(seedQuestions.map((q) => q.slug));
  const ex = new Set(labExercises.map((e) => e.id));
  assert.equal(slugs.size, seedCourses.length, "unique course slugs");
  assert.equal(qSlugs.size, seedQuestions.length, "unique question slugs");
  for (const p of seedPaths) for (const s of p.courseSlugs) assert.ok(slugs.has(s), `path ${p.id} -> ${s}`);
  for (const g of careerGoals) {
    for (const st of g.stages) for (const s of st.courseSlugs) assert.ok(slugs.has(s), `goal ${g.id} -> ${s}`);
    for (const q of g.questionSlugs) assert.ok(qSlugs.has(q), `goal ${g.id} -> question ${q}`);
    assert.ok(seedPaths.some((p) => p.slug === g.pathSlug), `goal ${g.id} -> path ${g.pathSlug}`);
  }
  for (const q of seedQuestions) {
    for (const s of q.relatedCourseSlugs) assert.ok(slugs.has(s), `question ${q.slug} -> ${s}`);
    if (q.labExerciseId) assert.ok(ex.has(q.labExerciseId), `question ${q.slug} -> lab ${q.labExerciseId}`);
    if (q.type === "multiple-choice") assert.ok(typeof q.answer === "number" && q.answer < (q.options?.length ?? 0), q.slug);
  }
  for (const c of seedCourses) for (const l of c.modules.flatMap((m) => m.lessons)) if (l.exerciseId) assert.ok(ex.has(l.exerciseId), `${l.id} -> ${l.exerciseId}`);
});

test("all seed courses and questions pass the admin validation schemas", () => {
  for (const c of seedCourses) assert.ok(courseSchema.safeParse(c).success, c.slug);
  for (const q of seedQuestions) {
    const r = questionSchema.safeParse(q);
    assert.ok(r.success, `${q.slug}: ${JSON.stringify(!r.success && r.error.issues[0])}`);
  }
});

test("form validation rejects bad input and the honeypot", () => {
  const base = { kind: "contact", name: "A Learner", email: "a@example.com", description: "I would like to learn more about Power BI.", consent: true } as const;
  assert.ok(inquirySchema.safeParse(base).success);
  assert.ok(!inquirySchema.safeParse({ ...base, email: "nope" }).success);
  assert.ok(!inquirySchema.safeParse({ ...base, consent: false }).success);
  assert.ok(!inquirySchema.safeParse({ ...base, website: "http://spam" }).success, "honeypot");
  assert.ok(!bookingSchema.safeParse({ serviceId: "x", startsAt: "tomorrow", name: "A", email: "a@example.com", consent: true }).success);
  assert.ok(
    !testimonialSchema.safeParse({ id: "t", name: "N", quote: "Q", verified: false, published: true, createdAt: "" }).success,
    "unverified testimonials can't be published",
  );
});

test("local store prevents overlapping bookings for the same instructor", async () => {
  const { localStore } = await import("../src/lib/data/local-store");
  const make = (id: string, startsAt: string, endsAt: string, instructorId = "niyobyose-brancal"): Booking => ({
    id,
    reference: `BK-${id}`,
    serviceId: "individual-tutoring",
    instructorId,
    startsAt,
    endsAt,
    name: "Test",
    email: "t@example.com",
    phone: "",
    organization: "",
    notes: "",
    status: "pending",
    manageToken: `token-${id}`,
    userId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    adminNote: "",
  });
  const a = await localStore.createBooking(make("a", "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z"));
  assert.ok(a.ok);
  // Concurrent attempts at an overlapping slot: exactly one more may succeed (none here).
  const [b, c] = await Promise.all([
    localStore.createBooking(make("b", "2026-11-02T07:30:00Z", "2026-11-02T08:30:00Z")),
    localStore.createBooking(make("c", "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z")),
  ]);
  assert.ok(!b.ok && !c.ok, "overlaps rejected");
  const d = await localStore.createBooking(make("d", "2026-11-02T08:00:00Z", "2026-11-02T09:00:00Z"));
  assert.ok(d.ok, "back-to-back is fine");
  const e = await localStore.createBooking(make("e", "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z", "someone-else"));
  assert.ok(e.ok, "different instructor is fine");
  // Cancelling frees the slot
  await localStore.updateBooking("a", { status: "cancelled" });
  const f = await localStore.createBooking(make("f", "2026-11-02T07:00:00Z", "2026-11-02T08:00:00Z"));
  assert.ok(f.ok, "slot reusable after cancellation");
  assert.equal((await localStore.getBookingByToken("token-f"))?.id, "f");
  rmSync(dir, { recursive: true, force: true });
});
