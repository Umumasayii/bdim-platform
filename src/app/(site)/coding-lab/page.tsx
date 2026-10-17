import type { Metadata } from "next";
import { Suspense } from "react";
import { labExercises } from "@/content/exercises";
import { labDatasets } from "@/content/datasets";
import { Container, PageHeader } from "@/components/ui/layout";
import { CodingLab } from "@/components/lab/coding-lab";

export const metadata: Metadata = {
  title: "Coding Lab",
  description: "Write and run Python, SQL and R in your browser with sample datasets and guided exercises.",
  alternates: { canonical: "/coding-lab" },
};

export default function CodingLabPage() {
  return (
    <>
      <PageHeader
        eyebrow="Coding Lab"
        title="Write real code. See real output."
        description="Python, SQL and R run directly in your browser with sample datasets. Pick an exercise or practise freely — output checks only pass on what your code actually prints."
      />
      <Container className="py-10">
        <Suspense fallback={<div className="h-[36rem] animate-pulse rounded-2xl bg-surface-2" />}>
          <CodingLab exercises={labExercises} datasets={labDatasets} />
        </Suspense>
      </Container>
    </>
  );
}
