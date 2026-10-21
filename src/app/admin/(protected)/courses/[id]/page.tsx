import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { isSupabaseConfigured } from "@/lib/config";
import { createUserClient } from "@/lib/supabase/server";
import { labExercises } from "@/content/exercises";
import { CourseEditor } from "@/components/admin/course-editor";
import type { Course } from "@/lib/types";

export const metadata = { title: "Edit course" };

function blankCourse(): Course {
  return {
    id: "",
    slug: "",
    title: "",
    category: "analytics-bi",
    level: "Beginner",
    summary: "",
    description: "",
    prerequisites: [],
    skills: [],
    objectives: [],
    tools: [],
    formats: ["Live online"],
    duration: "",
    modules: [],
    pricing: { mode: "quote", note: "Pricing is negotiable for individuals, groups and organizations." },
    enrollmentMode: "approval",
    certificate: { enabled: true, requireAllLessons: true, minQuizScore: 70 },
    featured: false,
    published: false,
    sortOrder: 999,
  };
}

export default async function EditCoursePage({ params }: PageProps<"/admin/courses/[id]">) {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  const viewer = await requireStaffPage();
  const { id } = await params;
  let course: Course | undefined;
  if (id === "new") course = blankCourse();
  else {
    course = (await getStore().listCourses({ includeUnpublished: true })).find((c) => c.id === id);
    if (course && isSupabaseConfigured) {
      // Lesson bodies live in lesson_contents (staff can read all of them).
      const db = await createUserClient();
      const ids = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const { data: bodies } = await db.from("lesson_contents").select("lesson_id, body").in("lesson_id", ids);
      const map = new Map((bodies ?? []).map((b) => [b.lesson_id as string, b.body as string]));
      course = { ...course, modules: course.modules.map((m) => ({ ...m, lessons: m.lessons.map((l) => ({ ...l, content: map.get(l.id) ?? "" })) })) };
    }
  }
  if (!course) notFound();
  return <CourseEditor initial={course} isNew={id === "new"} isAdmin={viewer.role === "admin"} exerciseIds={labExercises.map((e) => ({ id: e.id, title: e.title }))} />;
}
