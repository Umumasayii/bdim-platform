"use client";

import { Printer } from "lucide-react";
import { useLearner } from "@/lib/learner/provider";
import Image from "next/image";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/utils";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/config";

export function CertificateView({ id }: { id: string }) {
  const { ready, state } = useLearner();
  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />;
  const cert = state.certificates.find((c) => c.id === id);
  if (!cert) {
    return <EmptyState title="Certificate not found" action={<ButtonLink href="/dashboard">Back to dashboard</ButtonLink>} />;
  }
  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden /> Print or save as PDF
        </Button>
      </div>
      <article className="relative mx-auto aspect-[1.414] max-w-4xl overflow-hidden rounded-2xl border-8 border-double border-navy-800 bg-white p-8 text-center sm:p-14">
        {cert.demo ? (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-12 select-none text-6xl font-black uppercase tracking-widest text-amber-500/20 sm:text-8xl" aria-hidden>
            Demonstration
          </p>
        ) : null}
        <div className="relative flex h-full flex-col items-center justify-between">
          <Image src="/brand/bdim-logo.png" alt={site.name} width={1080} height={795} className="h-24 w-auto sm:h-28" priority />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Certificate of completion</p>
            <p className="mt-4 text-sm text-muted">This certifies that</p>
            <p className="mt-2 text-3xl font-bold text-navy-950 sm:text-4xl">{cert.learnerName}</p>
            <p className="mt-4 text-sm text-muted">has completed the requirements of the course</p>
            <p className="mt-2 text-xl font-semibold text-teal-700 sm:text-2xl">{cert.courseTitle}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-6 text-left text-xs text-muted">
            <div>
              <p>Issued {formatDate(cert.issuedAt)}</p>
              <p>Certificate no. {cert.number}</p>
            </div>
            <div className="text-right">
              <p>{site.legalName}</p>
              {cert.demo ? (
                <p className="font-semibold text-amber-700">Demonstration only — not a valid certificate</p>
              ) : (
                <p>Verify at {siteUrl.replace(/^https?:\/\//, "")}/certificates/verify</p>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
