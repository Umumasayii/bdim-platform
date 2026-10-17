import type { Metadata } from "next";
import { getPublishedLibrary } from "@/lib/data/library";
import { getPublishedCourses } from "@/lib/data/content";
import { Container, PageHeader } from "@/components/ui/layout";
import { LibraryBrowser } from "@/components/practice/library-browser";

export const metadata: Metadata = {
  title: "Library",
  description: "Books, lecture notes, slides, datasets and videos from Big Data IQ Minds.",
  alternates: { canonical: "/library" },
};

export default async function LibraryPage() {
  const [items, courses] = await Promise.all([getPublishedLibrary(), getPublishedCourses()]);
  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Books, notes and datasets"
        description="Learning resources from BDIM courses. Some are free for everyone; others open when you sign in or enrol in the related course."
      />
      <Container className="py-10">
        <LibraryBrowser items={items} courses={courses.map((c) => ({ id: c.id, slug: c.slug, title: c.title }))} />
      </Container>
    </>
  );
}
