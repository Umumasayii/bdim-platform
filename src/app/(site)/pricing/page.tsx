import type { Metadata } from "next";
import { Building2, User, Users, Wrench } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Flexible, negotiable pricing for individual learners, groups, organizations and consulting engagements.",
  alternates: { canonical: "/pricing" },
};

const options = [
  { icon: User, title: "Individual learners", text: "Single courses, learning paths or one-to-one sessions. Ask about flexible payment arrangements.", href: "/courses", cta: "Browse courses" },
  { icon: Users, title: "Customised group training", text: "Classes for study groups, cohorts or professional networks — online or in Kigali.", href: "/contact", cta: "Request a group quote" },
  { icon: Building2, title: "Corporate & institutional", text: "Programmes designed for your team's tools, data and goals, with assessment and follow-up.", href: "/corporate-training", cta: "Request training" },
  { icon: Wrench, title: "Consulting engagements", text: "Scoped per project: analysis, survey systems, dashboards, GIS or predictive models.", href: "/consulting#inquiry", cta: "Discuss a project" },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Flexible pricing, agreed with you"
        description="BDIM's prices are negotiable and depend on format, group size and customisation. Request a quote and we'll respond with clear options — no hidden fees."
      />
      <Container className="py-12">
        <ul className="grid gap-6 md:grid-cols-2">
          {options.map((o) => (
            <li key={o.title} className="flex flex-col rounded-2xl border border-line bg-white p-6">
              <o.icon className="size-7 text-teal-600" aria-hidden />
              <h2 className="mt-4 text-xl font-bold text-navy-950">{o.title}</h2>
              <p className="mt-2 text-muted">{o.text}</p>
              <p className="mt-4 text-lg font-semibold text-navy-900">Contact us for pricing</p>
              <div className="mt-auto pt-5">
                <ButtonLink href={o.href} variant="outline">
                  {o.cta}
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">The free practice zone, sample lessons and Coding Lab exercises are free to use.</p>
      </Container>
    </>
  );
}
