import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/content/projects";
import { Container, PageHeader } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { ProjectChart } from "@/components/projects/project-chart";
import { ButtonLink } from "@/components/ui/button";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  return p ? { title: `${p.title} (example project)`, description: p.summary } : { title: "Project" };
}

async function ProjectPage({ params }: { params: PageProps<"/projects/[slug]">["params"] }) {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <>
      <PageHeader eyebrow={p.domain} title={p.title} description={p.summary}>
        <Link href="/projects" className="text-sm font-medium text-teal-700 hover:underline">
          ← All projects
        </Link>
      </PageHeader>
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[1.3fr_minmax(0,1fr)]">
        <div className="grid content-start gap-8">
          {p.isExample ? (
            <Notice tone="warning" title="Example project">
              Built with synthetic data to demonstrate methods. Results are illustrative, not real findings.
            </Notice>
          ) : null}
          <div className="rounded-2xl border border-line bg-white p-5">
            <ProjectChart chart={p.chart} />
          </div>
          <section>
            <h2 className="text-lg font-bold text-navy-950">The problem</h2>
            <p className="mt-2 leading-relaxed text-navy-900">{p.problem}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy-950">Findings</h2>
            <ul className="mt-2 grid gap-1.5 text-navy-900">
              {p.findings.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy-950">Practical impact</h2>
            <p className="mt-2 leading-relaxed text-navy-900">{p.impact}</p>
          </section>
        </div>
        <aside className="grid content-start gap-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold text-navy-950">Methods</h2>
            <ul className="mt-2 grid gap-1 text-sm text-muted">
              {p.methods.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
            <h2 className="mt-5 font-semibold text-navy-950">Tools</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.tools.map((t) => (
                <Badge key={t} tone="teal">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-semibold text-navy-950">Need something similar?</p>
            <p className="mt-1 text-sm text-muted">Learn these methods in a course, or ask us to support your project.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/courses" size="sm">
                Explore courses
              </ButtonLink>
              <ButtonLink href="/consulting#inquiry" size="sm" variant="outline">
                Discuss a project
              </ButtonLink>
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}

export default function Page({ params }: PageProps<"/projects/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectPage params={params} />
    </Suspense>
  );
}
