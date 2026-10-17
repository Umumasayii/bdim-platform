import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/layout";
import { CertificateView } from "@/components/learner/certificate-view";

export const metadata: Metadata = { title: "Certificate", robots: { index: false } };

async function Cert({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateView id={id} />;
}

export default function CertificatePage({ params }: PageProps<"/dashboard/certificates/[id]">) {
  return (
    <Container className="py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
        <Cert params={params} />
      </Suspense>
    </Container>
  );
}
