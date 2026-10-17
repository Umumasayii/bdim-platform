/*
  Seeds a Supabase project with BDIM's starter content (courses, lessons,
  quizzes, learning paths, questions, instructor profile, booking services
  and the default schedule). Safe to re-run: rows are upserted by id.

    npm run seed:supabase

  Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
  Run the SQL migration in supabase/migrations first.
*/
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { seedCourses } from "../src/content/courses";
import { seedPaths } from "../src/content/paths";
import { seedQuestions } from "../src/content/questions";
import { seedInstructors } from "../src/content/people";
import { seedBookableServices, seedBookingSettings } from "../src/content/services";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local) before seeding.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const snake = (k: string) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const row = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), v]));

async function upsert(table: string, rows: object[]) {
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table}: ${rows.length}`);
}

async function main() {
  await upsert("instructors", seedInstructors.map(row));
  await upsert(
    "courses",
    seedCourses.map(({ modules: _m, ...c }) => {
      void _m;
      return row(c);
    }),
  );
  await upsert(
    "course_modules",
    seedCourses.flatMap((c) => c.modules.map((m, i) => ({ id: m.id, course_id: c.id, position: i, title: m.title, summary: m.summary, assignment: m.assignment ?? null }))),
  );
  await upsert(
    "lessons",
    seedCourses.flatMap((c) =>
      c.modules.flatMap((m) =>
        m.lessons.map((l, i) => ({
          id: l.id,
          module_id: m.id,
          course_id: c.id,
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
  await upsert(
    "lesson_contents",
    seedCourses.flatMap((c) => c.modules.flatMap((m) => m.lessons.filter((l) => l.content).map((l) => ({ lesson_id: l.id, body: l.content })))),
  );
  await upsert(
    "quizzes",
    seedCourses.flatMap((c) =>
      c.modules.flatMap((m) => (m.quiz ? [{ id: m.quiz.id, module_id: m.id, course_id: c.id, title: m.quiz.title, pass_mark: m.quiz.passMark, questions: m.quiz.questions }] : [])),
    ),
  );
  await upsert("learning_paths", seedPaths.map(row));
  await upsert("questions", seedQuestions.map(row));
  await upsert("bookable_services", seedBookableServices.map(row));
  await upsert("booking_settings", [{ id: 1, settings: seedBookingSettings }]);
  console.log("\nSeed complete. Review the instructor profile, booking schedule and sample content in /admin.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
