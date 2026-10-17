import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/content/projects";
import { Container, PageHeader } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "Project Portfolio",
  description: "Example dashboards, statistical reports, GIS maps, survey analytics and machine learning projects showing BDIM's practical methods.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Practical project portfolio"
        title="See the methods in action"
        description="Each project explains the problem, methods, tools, findings and practical impact — the same structure learners use for their own portfolios."
      />
      <Container className="py-12">
        <Notice tone="warning" title="Demonstration projects" className="mb-8">
          These projects use synthetic data to illustrate techniques taught at BDIM. They are not client engagements and the figures are not real
          statistics.
        </Notice>
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/projects/${p.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 transition hover:border-teal-300 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">{p.domain}</span>
                  {p.isExample ? <Badge tone="amber">Example</Badge> : null}
                </div>
                <span className="mt-3 text-lg font-bold text-navy-950">{p.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</span>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-5">
                  {p.tools.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
