import type { Metadata } from "next";
import { Compass, Eye, Target } from "lucide-react";
import { site } from "@/lib/site";
import { getInstructors } from "@/lib/data/content";
import { Container, PageHeader, SectionHeading } from "@/components/ui/layout";
import { InstructorCard } from "@/components/home/instructor-card";

export const metadata: Metadata = {
  title: "About Us",
  description: site.description,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const instructors = await getInstructors();
  return (
    <>
      <PageHeader eyebrow={site.legalName} title={site.tagline} description={site.description} />
      <Container className="grid gap-16 py-14">
        <section className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Target, title: "Mission", text: site.mission },
            { icon: Eye, title: "Vision", text: site.vision },
            { icon: Compass, title: "Focus", text: "Rwanda and the wider East African region, with training designed for learners anywhere." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-line bg-white p-6">
              <b.icon className="size-6 text-teal-600" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-navy-950">{b.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{b.text}</p>
            </div>
          ))}
        </section>

        <section>
          <SectionHeading eyebrow="Core values" title="What guides our work" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {site.values.map((v) => (
              <li key={v.title} className="rounded-2xl border border-line bg-surface p-5">
                <p className="font-bold text-navy-950">{v.title}</p>
                <p className="mt-1 text-sm text-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading eyebrow="What we do" title="Education and consulting, connected" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6">
              <h3 className="font-bold text-navy-950">For individuals</h3>
              <p className="mt-2 text-muted">
                Practical courses, free practice, a browser-based coding lab and one-to-one sessions in data analytics, statistics, programming,
                AI, business intelligence, survey systems and GIS.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6">
              <h3 className="font-bold text-navy-950">For organizations</h3>
              <p className="mt-2 text-muted">
                Customised training and analytics support: survey design, data cleaning, statistical analysis, dashboards, geospatial analysis
                and predictive modelling.
              </p>
            </div>
          </div>
        </section>

        {instructors.length ? (
          <section>
            <SectionHeading eyebrow="Team" title="Instructors" />
            <div className="grid gap-6">
              {instructors.map((i) => (
                <InstructorCard key={i.id} profile={i} />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}
