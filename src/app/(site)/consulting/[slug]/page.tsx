import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { consultingServices } from "@/content/services";
import { Container, PageHeader } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { InquiryForm } from "@/components/forms/inquiry-form";

export function generateStaticParams() {
  return consultingServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/consulting/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = consultingServices.find((x) => x.slug === slug);
  return s ? { title: s.title, description: s.summary, alternates: { canonical: `/consulting/${slug}` } } : { title: "Consulting" };
}

async function ServicePage({ params }: { params: PageProps<"/consulting/[slug]">["params"] }) {
  const { slug } = await params;
  const s = consultingServices.find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <>
      <PageHeader eyebrow="Consulting service" title={s.title} description={s.description}>
        <Link href="/consulting" className="text-sm font-medium text-teal-700 hover:underline">
          ← All services
        </Link>
      </PageHeader>
      <Container className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
        <div className="grid content-start gap-8">
          <section>
            <h2 className="text-lg font-bold text-navy-950">What you receive</h2>
            <ul className="mt-3 grid gap-2">
              {s.deliverables.map((d) => (
                <li key={d} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-leaf-500" aria-hidden /> {d}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy-950">Methods</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {s.methods.map((m) => (
                <li key={m}>
                  <Badge tone="teal">{m}</Badge>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy-950">Tools</h2>
            <p className="mt-2 text-sm text-muted">{s.tools.join(" · ")}</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-navy-950">Typical clients</h2>
            <p className="mt-2 text-sm text-muted">{s.idealFor.join(" · ")}</p>
          </section>
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-navy-950">Request this service</h2>
          <p className="mt-1 text-sm text-muted">Pricing is agreed per engagement. Please don&apos;t include confidential data in this form.</p>
          <div className="mt-6">
            <InquiryForm kind="consulting" serviceCategory={s.title} descriptionLabel="Project description" submitLabel="Send inquiry" />
          </div>
        </div>
      </Container>
    </>
  );
}

export default function Page({ params }: PageProps<"/consulting/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServicePage params={params} />
    </Suspense>
  );
}
