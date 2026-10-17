import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Booking } from "@/lib/types";
import { buildSeedDb, type DbShape } from "./seed";
import { StoreError, type CreateBookingResult, type Store } from "./store-types";

/*
  File-backed store for local development and single-server deployments.
  Data lives in .data/bdim-db.json (git-ignored). Until the first write, reads
  come straight from the seed content. Serverless hosts (e.g. Vercel) have a
  read-only file system — configure Supabase there instead.
*/
const DATA_DIR = process.env.BDIM_DATA_DIR || path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "bdim-db.json");

let writeChain: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbShape;
    // Fill any collections added after the file was first written.
    return { ...buildSeedDb(), ...parsed };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return buildSeedDb();
    throw new StoreError(`Could not read local data file: ${(err as Error).message}`);
  }
}

/** Serialises read-modify-write cycles so concurrent requests can't clobber each other. */
function mutate<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  const run = writeChain.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmp = `${DATA_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
      await fs.rename(tmp, DATA_FILE);
    } catch (err) {
      throw new StoreError(
        `Saving failed: the local data store is not writable here (${(err as Error).message}). Configure Supabase for this environment.`,
      );
    }
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function upsertById<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) list.push(item);
  else list[i] = item;
}

const ACTIVE: Booking["status"][] = ["pending", "confirmed"];

function overlaps(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) {
  return new Date(a.startsAt) < new Date(b.endsAt) && new Date(b.startsAt) < new Date(a.endsAt);
}

function hasConflict(db: DbShape, candidate: Booking) {
  return db.bookings.some(
    (b) =>
      b.id !== candidate.id &&
      ACTIVE.includes(b.status) &&
      b.instructorId === candidate.instructorId &&
      overlaps(b, candidate),
  );
}

export const localStore: Store = {
  kind: "local",

  async listCourses(opts) {
    const db = await readDb();
    return db.courses.filter((c) => opts?.includeUnpublished || c.published).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  saveCourse: (course) => mutate((db) => upsertById(db.courses, course)),
  deleteCourse: (id) => mutate((db) => void (db.courses = db.courses.filter((c) => c.id !== id))),

  async listPaths(opts) {
    const db = await readDb();
    return db.paths.filter((p) => opts?.includeUnpublished || p.published).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  savePath: (p) => mutate((db) => upsertById(db.paths, p)),
  deletePath: (id) => mutate((db) => void (db.paths = db.paths.filter((p) => p.id !== id))),

  async listQuestions(opts) {
    const db = await readDb();
    return db.questions.filter((q) => opts?.includeUnpublished || q.published);
  },
  saveQuestion: (q) => mutate((db) => upsertById(db.questions, q)),
  deleteQuestion: (id) => mutate((db) => void (db.questions = db.questions.filter((q) => q.id !== id))),

  async listInstructors(opts) {
    const db = await readDb();
    return db.instructors.filter((i) => opts?.includeUnpublished || i.published);
  },
  saveInstructor: (p) => mutate((db) => upsertById(db.instructors, p)),

  async listTestimonials(opts) {
    const db = await readDb();
    return db.testimonials.filter((t) => opts?.includeUnpublished || (t.published && t.verified));
  },
  saveTestimonial: (t) => mutate((db) => upsertById(db.testimonials, t)),
  deleteTestimonial: (id) => mutate((db) => void (db.testimonials = db.testimonials.filter((t) => t.id !== id))),

  async listBookableServices(opts) {
    const db = await readDb();
    return db.bookableServices.filter((s) => opts?.includeUnpublished || s.active);
  },
  saveBookableService: (s) => mutate((db) => upsertById(db.bookableServices, s)),
  async getBookingSettings() {
    return (await readDb()).bookingSettings;
  },
  saveBookingSettings: (s) => mutate((db) => void (db.bookingSettings = s)),

  async listBusyIntervals(fromIso, toIso) {
    const db = await readDb();
    const window = { startsAt: fromIso, endsAt: toIso };
    return db.bookings
      .filter((b) => ACTIVE.includes(b.status) && overlaps(b, window))
      .map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt, instructorId: b.instructorId }));
  },
  createBooking(booking) {
    return mutate<CreateBookingResult>((db) => {
      if (hasConflict(db, booking)) {
        return { ok: false, reason: "conflict", message: "That time has just been booked. Please choose another slot." };
      }
      db.bookings.push(booking);
      return { ok: true, booking };
    });
  },
  async listBookings() {
    const db = await readDb();
    return [...db.bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
  async getBookingByToken(token) {
    const db = await readDb();
    return db.bookings.find((b) => b.manageToken === token) ?? null;
  },
  updateBooking(id, patch) {
    return mutate<CreateBookingResult>((db) => {
      const i = db.bookings.findIndex((b) => b.id === id);
      if (i === -1) return { ok: false, reason: "error", message: "Booking not found." };
      const next = { ...db.bookings[i], ...patch, updatedAt: new Date().toISOString() };
      if (ACTIVE.includes(next.status) && hasConflict(db, next)) {
        return { ok: false, reason: "conflict", message: "That time overlaps another booking." };
      }
      db.bookings[i] = next;
      return { ok: true, booking: next };
    });
  },

  createInquiry: (inq) => mutate((db) => void db.inquiries.push(inq)),
  async listInquiries() {
    const db = await readDb();
    return [...db.inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  updateInquiry: (id, patch) =>
    mutate((db) => {
      const i = db.inquiries.findIndex((x) => x.id === id);
      if (i === -1) throw new StoreError("Inquiry not found.");
      db.inquiries[i] = { ...db.inquiries[i], ...patch, updatedAt: new Date().toISOString() };
    }),
};
