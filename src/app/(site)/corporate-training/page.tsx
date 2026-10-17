import type { Metadata } from "next";
import { Briefcase, Building, GraduationCap, Landmark, Microscope } from "lucide-react";
import { getPublishedCourses } from "@/lib/data/content";
import { categories } from "@/content/categories";
import { Container, PageHeader, SectionHeading } from "@/components/ui/layout";
import { InquiryForm } from "@/components/forms/inquiry-form";

export const metadata: Metadata = {
  title: "Corporate & Institutional Training",
  description: "Customised data, statistics, survey, BI, GIS and AI training for universities, NGOs, government institutions, research teams and companies.",
  alternates: { canonical: "/corporate-training" },
};

const audiences = [
  { icon: GraduationCap, title: "Universities", text: "Methods and software training for students, faculty and research centres." },
  { icon: Landmark, title: "Government institutions", text: "Statistics, dashboards and data management for evidence-based policy." },
  { icon: Building, title: "NGOs & programmes", text: "M&E, survey systems, KoBoToolbox and indicator reporting." },
  { icon: Microscope, title: "Research teams", text: "Study design, STATA/R/SPSS and research-grade data collection." },
  { icon: Briefcase, title: "Private companies", text: "Excel, Power BI, SQL, KPIs and practical AI for business teams." },
];

export default async function CorporateTrainingPage() {
  const courses = await getPublishedCourses();
  return (
    <>
      <PageHeader
        eyebrow="Organizations"
        title="Training designed around your team, your tools and your data"
        description="Customised programmes delivered online or in person, built from our course catalogue or designed from scratch for your context."
      />
      <Container className="py-14">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {audiences.map((a) => (
            <li key={a.title} className="rounded-2xl border border-line bg-white p-5">
              <a.icon className="size-6 text-teal-600" aria-hidden />
              <p className="mt-3 font-bold text-navy-950">{a.title}</p>
              <p className="mt-1 text-sm text-muted">{a.text}</p>
            </li>
          ))}
        </ul>

        <section className="mt-16 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="How it works" title="From needs assessment to follow-up" className="mb-6" />
            <ol className="grid gap-4">
              {[
                ["Needs assessment", "We review your team's current skills, tools and goals."],
                ["Programme design", "Curriculum, schedule and materials — using anonymised versions of your own data where appropriate."],
                ["Delivery", "Hands-on sessions online or in person, with exercises and assessments."],
                ["Evaluation & follow-up", "Pre/post assessment results and optional follow-up clinics."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-800 text-sm font-bold text-white">{i + 1}</span>
                  <span>
                    <span className="block font-semibold text-navy-950">{t}</span>
                    <span className="text-sm text-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <h3 className="font-bold text-navy-950">Topics we can cover</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {categories.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-semibold text-navy-900">{c.short}</span>
                    <span className="block text-muted">
                      {courses
                        .filter((x) => x.category === c.id)
                        .slice(0, 4)
                        .map((x) => x.title.replace(/ for .*$/, ""))
                        .join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div id="inquiry" className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold text-navy-950">Request customised training</h2>
            <p className="mt-1 text-sm text-muted">Pricing is negotiable and depends on group size, duration and customisation.</p>
            <div className="mt-6">
              <InquiryForm
                kind="training"
                categories={categories.map((c) => c.title)}
                descriptionLabel="Training goals and context"
                submitLabel="Send training request"
                showParticipants
              />
            </div>
          </div>
        </section>
      </Container>
    </>
  );
}
