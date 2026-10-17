import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { labExercises } from "@/content/exercises";
import { QuestionEditor } from "@/components/admin/question-editor";
import type { Question } from "@/lib/types";

export const metadata = { title: "Edit question" };

const blank: Question = {
  id: "",
  slug: "",
  title: "",
  prompt: "",
  topic: "Statistics",
  difficulty: "Beginner",
  type: "multiple-choice",
  options: ["", ""],
  answer: 0,
  hints: [],
  solution: "",
  explanation: "",
  relatedCourseSlugs: [],
  tags: [],
  isSample: false,
  published: false,
  free: true,
};

export default async function EditQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  const { id } = await params;
  const store = getStore();
  const [questions, courses] = await Promise.all([store.listQuestions({ includeUnpublished: true }), store.listCourses({ includeUnpublished: true })]);
  const question = id === "new" ? blank : questions.find((q) => q.id === id);
  if (!question) notFound();
  return (
    <QuestionEditor
      initial={question}
      isNew={id === "new"}
      courses={courses.map((c) => ({ slug: c.slug, title: c.title }))}
      exercises={labExercises.map((e) => ({ id: e.id, title: e.title }))}
    />
  );
}
