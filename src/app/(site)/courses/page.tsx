import type { Metadata } from "next";
import { Suspense } from "react";
import { categories } from "@/content/categories";
import { getPublishedCourses } from "@/lib/data/content";
import { getCourseBooks } from "@/lib/data/library";
import { Container, PageHeader } from "@/components/ui/layout";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { CourseCard } from "@/components/courses/course-card";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Courses in Excel, Power BI, R, Python, SQL, statistics, STATA, SPSS, KoBoToolbox, SurveyCTO, machine learning, AI and ArcGIS Pro — for individuals, groups and organizations.",
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage() {
  const [courses, books] = await Promise.all([getPublishedCourses(), getCourseBooks()]);
  return (
    <>
      <PageHeader
        eyebrow="Course catalogue"
        title="Practical courses for every stage of your data career"
        description="Search and filter by category, level and format. Every course has modules, exercises and optional assessments. Pricing is negotiable — request a quote from any course."
      />
      <Container className="py-10">
        <Suspense
          fallback={
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <li key={c.id}>
                  <CourseCard course={c} books={books[c.id]} />
                </li>
              ))}
            </ul>
          }
        >
          <CourseCatalog courses={courses} categories={categories} books={books} />
        </Suspense>
      </Container>
    </>
  );
}
