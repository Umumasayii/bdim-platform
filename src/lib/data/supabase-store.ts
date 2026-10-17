import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingSettings, Course, CourseModule, Lesson, Quiz } from "@/lib/types";
import { createPublicClient, createServiceClient, createUserClient } from "@/lib/supabase/server";
import { seedBookingSettings } from "@/content/services";
import { StoreError, type CreateBookingResult, type Store } from "./store-types";

// ── snake_case <-> camelCase for flat rows (nested JSON is left untouched) ──
const toSnakeKey = (k: string) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const toCamelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function toRow(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnakeKey(k)] = v;
  return out;
}

function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamelKey(k)] = v === null ? undefined : v;
  return out as T;
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new StoreError(res.error.message);
  return res.data;
}

async function reader(includeUnpublished?: boolean): Promise<SupabaseClient> {
  // Staff reads need the user's session so RLS can see unpublished rows.
  return includeUnpublished ? createUserClient() : createPublicClient();
}

// ── Courses are normalised across courses / course_modules / lessons / quizzes ──
const COURSE_SELECT =
  "*, course_modules(*, lessons(*))";

interface ModuleRow {
  id: string;
  position: number;
  title: string;
  summary: string;
  assignment: CourseModule["assignment"] | null;
  lessons: LessonRow[];
}
interface LessonRow {
  id: string;
  position: number;
  title: string;
  summary: string;
  duration_minutes: number;
  is_sample: boolean;
  exercise_id: string | null;
  resources: Lesson["resources"];
}

function courseFromRow(row: Record<string, unknown>, quizzes: Map<string, Quiz>): Course {
  const modules = ((row.course_modules as ModuleRow[]) ?? [])
    .sort((a, b) => a.position - b.position)
    .map<CourseModule>((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      assignment: m.assignment ?? undefined,
      quiz: quizzes.get(m.id),
      lessons: (m.lessons ?? [])
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          durationMinutes: l.duration_minutes,
          isSample: l.is_sample,
          exerciseId: l.exercise_id ?? undefined,
          resources: l.resources ?? [],
        })),
    }));
  const { course_modules: _ignored, ...flat } = row;
  void _ignored;
  return { ...fromRow<Omit<Course, "modules">>(flat), modules };
}

async function loadQuizzes(client: SupabaseClient, staff: boolean): Promise<Map<string, Quiz>> {
  const map = new Map<string, Quiz>();
  if (staff) {
    const rows = check(await client.from("quizzes").select("*")) as Record<string, unknown>[];
    for (const r of rows) {
      map.set(r.module_id as string, {
        id: r.id as string,
        title: r.title as string,
        passMark: r.pass_mark as number,
        questions: r.questions as Quiz["questions"],
      });
    }
  } else {
    // Public outline: title and question count only, no questions or answers.
    const rows = check(await client.from("quiz_outlines").select("*")) as Record<string, unknown>[];
    for (const r of rows) {
      map.set(r.module_id as string, {
        id: r.id as string,
        title: r.title as string,
        passMark: r.pass_mark as number,
        questions: Array.from({ length: (r.question_count as number) ?? 0 }, (_, i) => ({
          id: `q${i + 1}`,
          prompt: "",
          options: [],
        })),
      });
    }
  }
  return map;
}

export const supabaseStore: Store = {
  kind: "supabase",

  async listCourses(opts) {
    const client = await reader(opts?.includeUnpublished);
    let query = client.from("courses").select(COURSE_SELECT).order("sort_order");
    if (!opts?.includeUnpublished) query = query.eq("published", true);
    const rows = check(await query) as Record<string, unknown>[];
    const quizzes = await loadQuizzes(client, Boolean(opts?.includeUnpublished));
    return rows.map((r) => courseFromRow(r, quizzes));
  },

  async saveCourse(course) {
    const db = await createUserClient();
    const { modules, ...flat } = course;
    check(await db.from("courses").upsert({ ...toRow(flat), updated_at: new Date().toISOString() }));

    const moduleIds = modules.map((m) => m.id);
    const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

    check(
      await db.from("course_modules").upsert(
        modules.map((m, i) => ({
          id: m.id,
          course_id: course.id,
          position: i,
          title: m.title,
          summary: m.summary,
          assignment: m.assignment ?? null,
        })),
      ),
    );
    check(
      await db.from("lessons").upsert(
        modules.flatMap((m) =>
          m.lessons.map((l, i) => ({
            id: l.id,
            module_id: m.id,
            course_id: course.id,
            position: i,
            title: l.title,
            summary: l.summary,
            duration_minutes: l.durationMinutes,
            is_sample: Boolean(l.isSample),
            exercise_id: l.exerciseId ?? null,
            resources: l.resources ?? [],
          })),
        ),
      ),
    );
    const contents = modules.flatMap((m) =>
      m.lessons.filter((l) => l.content !== undefined).map((l) => ({ lesson_id: l.id, body: l.content ?? "" })),
    );
    if (contents.length) check(await db.from("lesson_contents").upsert(contents));

    const quizRows = modules
      .filter((m) => m.quiz && m.quiz.questions.every((q) => q.answerIndex !== undefined))
      .map((m) => ({
        id: m.quiz!.id,
        module_id: m.id,
        course_id: course.id,
        title: m.quiz!.title,
        pass_mark: m.quiz!.passMark,
        questions: m.quiz!.questions,
      }));
    if (quizRows.length) check(await db.from("quizzes").upsert(quizRows));

    // Remove modules/lessons that were deleted in the editor.
    const quote = (ids: string[]) => `(${ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",")})`;
    if (lessonIds.length) check(await db.from("lessons").delete().eq("course_id", course.id).not("id", "in", quote(lessonIds)));
    if (moduleIds.length) check(await db.from("course_modules").delete().eq("course_id", course.id).not("id", "in", quote(moduleIds)));
  },

  async deleteCourse(id) {
    const db = await createUserClient();
    check(await db.from("courses").delete().eq("id", id));
  },

  async listPaths(opts) {
    const client = await reader(opts?.includeUnpublished);
    let q = client.from("learning_paths").select("*").order("sort_order");
    if (!opts?.includeUnpublished) q = q.eq("published", true);
    return (check(await q) as Record<string, unknown>[]).map((r) => fromRow(r));
  },
  async savePath(p) {
    check(await (await createUserClient()).from("learning_paths").upsert(toRow(p)));
  },
  async deletePath(id) {
    check(await (await createUserClient()).from("learning_paths").delete().eq("id", id));
  },

  async listQuestions(opts) {
    const client = await reader(opts?.includeUnpublished);
    let q = client.from("questions").select("*").order("topic");
    if (!opts?.includeUnpublished) q = q.eq("published", true);
    return (check(await q) as Record<string, unknown>[]).map((r) => fromRow(r));
  },
  async saveQuestion(question) {
    check(await (await createUserClient()).from("questions").upsert({ ...toRow(question), updated_at: new Date().toISOString() }));
  },
  async deleteQuestion(id) {
    check(await (await createUserClient()).from("questions").delete().eq("id", id));
  },

  async listInstructors(opts) {
    const client = await reader(opts?.includeUnpublished);
    let q = client.from("instructors").select("*").order("name");
    if (!opts?.includeUnpublished) q = q.eq("published", true);
    return (check(await q) as Record<string, unknown>[]).map((r) => fromRow(r));
  },
  async saveInstructor(p) {
    check(await (await createUserClient()).from("instructors").upsert(toRow(p)));
  },

  async listTestimonials(opts) {
    const client = await reader(opts?.includeUnpublished);
    let q = client.from("testimonials").select("*").order("created_at", { ascending: false });
    if (!opts?.includeUnpublished) q = q.eq("published", true).eq("verified", true);
    return (check(await q) as Record<string, unknown>[]).map((r) => fromRow(r));
  },
  async saveTestimonial(t) {
    check(await (await createUserClient()).from("testimonials").upsert(toRow(t)));
  },
  async deleteTestimonial(id) {
    check(await (await createUserClient()).from("testimonials").delete().eq("id", id));
  },

  async listBookableServices(opts) {
    const client = await reader(opts?.includeUnpublished);
    let q = client.from("bookable_services").select("*").order("title");
    if (!opts?.includeUnpublished) q = q.eq("active", true);
    return (check(await q) as Record<string, unknown>[]).map((r) => fromRow(r));
  },
  async saveBookableService(s) {
    check(await (await createUserClient()).from("bookable_services").upsert(toRow(s)));
  },
  async getBookingSettings() {
    const row = check(await createPublicClient().from("booking_settings").select("settings").eq("id", 1).maybeSingle()) as
      | { settings: BookingSettings }
      | null;
    return row?.settings ?? seedBookingSettings;
  },
  async saveBookingSettings(s) {
    check(await (await createUserClient()).from("booking_settings").upsert({ id: 1, settings: s }));
  },

  async listBusyIntervals(fromIso, toIso) {
    const rows = check(await createPublicClient().rpc("booked_intervals", { p_from: fromIso, p_to: toIso })) as {
      starts_at: string;
      ends_at: string;
      instructor_id: string;
    }[];
    return rows.map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at, instructorId: r.instructor_id }));
  },

  async createBooking(booking): Promise<CreateBookingResult> {
    const db = createServiceClient();
    const { error } = await db.from("bookings").insert(toRow(booking));
    if (error) {
      // 23P01 = exclusion_violation from the no_overlapping_bookings constraint
      if (error.code === "23P01") {
        return { ok: false, reason: "conflict", message: "That time has just been booked. Please choose another slot." };
      }
      return { ok: false, reason: "error", message: error.message };
    }
    return { ok: true, booking };
  },
  async listBookings() {
    const rows = check(await (await createUserClient()).from("bookings").select("*").order("starts_at")) as Record<string, unknown>[];
    return rows.map((r) => fromRow(r));
  },
  async getBookingByToken(token) {
    const row = check(await createServiceClient().from("bookings").select("*").eq("manage_token", token).maybeSingle()) as
      | Record<string, unknown>
      | null;
    return row ? fromRow(row) : null;
  },
  async updateBooking(id, patch): Promise<CreateBookingResult> {
    // Token-based (public) updates are authorised by the caller before reaching here.
    const db = createServiceClient();
    const { data, error } = await db
      .from("bookings")
      .update({ ...toRow(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      if (error.code === "23P01") return { ok: false, reason: "conflict", message: "That time overlaps another booking." };
      return { ok: false, reason: "error", message: error.message };
    }
    return { ok: true, booking: fromRow(data as Record<string, unknown>) };
  },

  async createInquiry(inquiry) {
    check(await createServiceClient().from("inquiries").insert(toRow(inquiry)));
  },
  async listInquiries() {
    const rows = check(
      await (await createUserClient()).from("inquiries").select("*").order("created_at", { ascending: false }),
    ) as Record<string, unknown>[];
    return rows.map((r) => fromRow(r));
  },
  async updateInquiry(id, patch) {
    check(
      await (await createUserClient())
        .from("inquiries")
        .update({ ...toRow(patch), updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  },
};
