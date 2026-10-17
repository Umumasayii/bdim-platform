import type { Metadata } from "next";
import { getPaymentSettings, getPublishedLibrary } from "@/lib/data/library";
import { getPublishedCourses } from "@/lib/data/content";
import { Container, PageHeader } from "@/components/ui/layout";
import { LibraryBrowser } from "@/components/practice/library-browser";

export const metadata: Metadata = {
  title: "Library",
  description: "Books, lecture notes, slides, datasets and videos from Big Data IQ Minds.",
  alternates: { canonical: "/library" },
};

export default async function LibraryPage() {
  const [items, courses, payment] = await Promise.all([getPublishedLibrary(), getPublishedCourses(), getPaymentSettings()]);
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Books, notes and datasets"
        description="Learning resources from BDIM courses. Many are free; some open when you sign in or enrol, and books for sale unlock once your payment is confirmed."
      />
      <Container className="py-10">
        <LibraryBrowser items={items} courses={courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title }))} payment={payment} />
      </Container>
    </>
  );
}
