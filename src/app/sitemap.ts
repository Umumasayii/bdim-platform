import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { getPublishedCourses, getPublishedPaths, getPublishedQuestions } from "@/lib/data/content";
import { consultingServices } from "@/content/services";
import { projects } from "@/content/projects";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, paths, questions] = await Promise.all([getPublishedCourses(), getPublishedPaths(), getPublishedQuestions()]);
  const staticPages = [
    "", "/courses", "/learning-paths", "/practice", "/questions", "/coding-lab", "/library", "/live-training", "/consulting",
    "/corporate-training", "/projects", "/pricing", "/about", "/contact", "/privacy", "/terms",
  ];
  return [
    ...staticPages.map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...courses.map((c) => ({ url: `${siteUrl}/courses/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...courses.flatMap((c) =>
      c.modules.flatMap((m) => m.lessons.filter((l) => l.isSample).map((l) => ({ url: `${siteUrl}/learn/${c.slug}/${l.id}`, priority: 0.5 }))),
    ),
    ...paths.map((p) => ({ url: `${siteUrl}/learning-paths/${p.slug}`, priority: 0.7 })),
    ...questions.map((q) => ({ url: `${siteUrl}/questions/${q.slug}`, priority: 0.5 })),
    ...consultingServices.map((s) => ({ url: `${siteUrl}/consulting/${s.slug}`, priority: 0.6 })),
    ...projects.map((p) => ({ url: `${siteUrl}/projects/${p.slug}`, priority: 0.4 })),
  ];
}
