import type { Metadata } from "next";
import { getPublishedQuestions } from "@/lib/data/content";
import { Container, PageHeader } from "@/components/ui/layout";
import { QuestionBank } from "@/components/practice/question-bank";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "Question Bank",
  description: "Original practice questions in Excel, SQL, Python, R, statistics, probability, machine learning, Power BI, GIS, survey methods and data interpretation.",
  alternates: { canonical: "/questions" },
};

export default async function QuestionsPage() {
  const questions = await getPublishedQuestions();
  return (
    <>
      <PageHeader
        eyebrow="Question bank"
        title="Practise the questions analysts actually face"
        description="Search and filter by topic, difficulty, language and type. Save questions to your collection, track attempts, and learn from worked solutions."
      />
      <Container className="py-10">
        <Notice tone="info" className="mb-6">
          Questions are original sample content written for BDIM learners. They are not taken from any company&apos;s interviews.
        </Notice>
        <QuestionBank questions={questions} />
      </Container>
    </>
  );
}
