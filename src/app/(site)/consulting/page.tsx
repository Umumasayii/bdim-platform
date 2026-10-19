import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { consultingServices } from "@/content/services";
import { Container, PageHeader, SectionHeading } from "@/components/ui/layout";
import { InquiryForm } from "@/components/forms/inquiry-form";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "Consulting & Corporate Services",
  description: "Data analysis, statistical consulting, survey design, data cleaning, BI dashboards, GIS, machine learning, research support and custom training.",
  alternates: { canonical: "/consulting" },
};

export default function ConsultingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Consulting"
        title="Analytics support that turns your data into decisions"
        description="From survey design and data cleaning to dashboards and predictive models — practical support for NGOs, businesses, researchers and public institutions."
      />
      <Container className="py-14">
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {consultingServices.map((s) => (
            <li key={s.slug}>
              <Link href={`/consulting/${s.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition hover:border-teal-300 hover:shadow-[var(--shadow-lift)]">
                <span className="text-lg font-bold text-navy-950">{s.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{s.summary}</span>
                <span className="mt-4 text-xs text-muted">{s.tools.join(" · ")}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-teal-700">
                  Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section id="inquiry" className="mt-20 grid grid-cols-1 scroll-mt-24 gap-10 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
          <div>
            <SectionHeading eyebrow="Start a conversation" title="Tell us about your project" className="mb-6" />
            <p className="text-muted">
              Describe the problem, your timeline and the decisions the work should support. We will reply with questions or a proposal. Pricing
              is agreed per engagement.
            </p>
            <Notice tone="info" title="About your data" className="mt-6">
              Please don&apos;t upload or paste confidential datasets or personal information here. If a project needs data access, we will agree
              a secure method and a data-sharing agreement first.
            </Notice>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <InquiryForm
              kind="consulting"
              categories={consultingServices.map((s) => s.title)}
              descriptionLabel="Project description"
              submitLabel="Send project inquiry"
            />
          </div>
        </section>
      </Container>
    </>
  );
}
