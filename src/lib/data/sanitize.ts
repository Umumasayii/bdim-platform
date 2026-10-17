import type { Course, CourseModule } from "@/lib/types";

/**
 * Public course shape: no lesson bodies and no quiz answer keys.
 * Lesson content is fetched separately, subject to access rules.
 */
export function toPublicCourse(course: Course): Course {
  return {
    ...course,
    modules: course.modules.map(
      (m): CourseModule => ({
        ...m,
        lessons: m.lessons.map(({ content, ...l }) => ({ ...l, content: content ? "" : undefined })),
        quiz: m.quiz
          ? {
              ...m.quiz,
              questions: m.quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
            }
          : undefined,
      }),
    ),
  };
}

export function courseLessonCount(course: Course) {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0);
}

export function courseMinutes(course: Course) {
  return course.modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.durationMinutes, 0), 0);
}
