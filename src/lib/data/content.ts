import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getStore } from "./store";
import { toPublicCourse } from "./sanitize";

/*
  Cached public reads. Each is tagged so admin mutations can refresh it with
  updateTag(). Nothing here reads cookies, so these are safe in "use cache".
*/
export const TAGS = {
  courses: "courses",
  paths: "paths",
  questions: "questions",
  instructors: "instructors",
  testimonials: "testimonials",
  booking: "booking-config",
} as const;

export async function getPublishedCourses() {
  "use cache";
  cacheTag(TAGS.courses);
  cacheLife("hours");
  const courses = await getStore().listCourses();
  return courses.map(toPublicCourse);
}

export async function getCourseBySlug(slug: string) {
  "use cache";
  cacheTag(TAGS.courses);
  cacheLife("hours");
  const courses = await getStore().listCourses();
  const course = courses.find((c) => c.slug === slug);
  return course ? toPublicCourse(course) : null;
}

export async function getPublishedPaths() {
  "use cache";
  cacheTag(TAGS.paths);
  cacheLife("hours");
  return getStore().listPaths();
}

export async function getPublishedQuestions() {
  "use cache";
  cacheTag(TAGS.questions);
  cacheLife("hours");
  return getStore().listQuestions();
}

export async function getInstructors() {
  "use cache";
  cacheTag(TAGS.instructors);
  cacheLife("hours");
  return getStore().listInstructors();
}

export async function getPublishedTestimonials() {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("hours");
  return getStore().listTestimonials();
}

export async function getBookingConfig() {
  "use cache";
  cacheTag(TAGS.booking);
  cacheLife("minutes");
  const store = getStore();
  const [services, settings, instructors] = await Promise.all([
    store.listBookableServices(),
    store.getBookingSettings(),
    store.listInstructors(),
  ]);
  return { services, settings, instructors };
}
