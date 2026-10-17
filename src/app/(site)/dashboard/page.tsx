import type { Metadata } from "next";
import { getPublishedCourses, getPublishedQuestions } from "@/lib/data/content";
import { Container } from "@/components/ui/layout";
import { LearnerDashboard } from "@/components/learner/dashboard";

export const metadata: Metadata = { title: "My learning", robots: { index: false } };

export default async function DashboardPage() {
  const [courses, questions] = await Promise.all([getPublishedCourses(), getPublishedQuestions()]);
  return (
    <Container className="py-10">
      <h1 className="mb-8 text-3xl font-bold text-navy-950">My learning</h1>
      <LearnerDashboard courses={courses} questions={questions} />
    </Container>
  );
}
