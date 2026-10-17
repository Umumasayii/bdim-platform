import "server-only";
import { isSupabaseConfigured } from "@/lib/config";
import { createUserClient } from "@/lib/supabase/server";
import { getStore } from "./store";

export type LessonContentResult =
  | { status: "ok"; body: string }
  | { status: "empty" }
  | { status: "locked" };

/**
 * Lesson body for the current viewer. With Supabase, row-level security
 * decides access (sample lesson, active enrollment or staff). In demo mode the
 * body is returned and the client applies the browser-held enrollment check.
 */
export async function getLessonContent(courseSlug: string, lessonId: string): Promise<LessonContentResult> {
  if (isSupabaseConfigured) {
    const db = await createUserClient();
    const { data, error } = await db.from("lesson_contents").select("body").eq("lesson_id", lessonId).maybeSingle();
    if (error || !data) {
      // No row visible: either locked by RLS, or no content written yet.
      const { data: lesson } = await db.from("lessons").select("is_sample").eq("id", lessonId).maybeSingle();
      return lesson?.is_sample ? { status: "empty" } : { status: "locked" };
    }
    return data.body ? { status: "ok", body: data.body } : { status: "empty" };
  }
  const course = (await getStore().listCourses()).find((c) => c.slug === courseSlug);
  const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
  return lesson?.content ? { status: "ok", body: lesson.content } : { status: "empty" };
}
