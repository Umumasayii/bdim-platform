import type { Metadata } from "next";
import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createPublicClient } from "@/lib/supabase/server";
import { Container, PageHeader } from "@/components/ui/layout";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify a certificate", alternates: { canonical: "/certificates/verify" } };

async function Result({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const { number } = await searchParams;
  const value = (number ?? "").trim().toUpperCase();
  if (!value) return null;
  if (!/^BDIM-[A-F0-9]{10}$/.test(value)) {
    return <Notice tone="warning">That doesn&apos;t look like a BDIM certificate number (format BDIM-XXXXXXXXXX).</Notice>;
  }
  if (!isSupabaseConfigured) return <Notice tone="info">Certificate verification becomes available once the database is configured.</Notice>;
  const { data } = await createPublicClient().rpc("verify_certificate", { p_number: value });
  const row = (data as { learner_name: string; course_title: string; issued_at: string }[] | null)?.[0];
  return row ? (
    <Notice tone="success" title="Valid certificate">
      Issued to <strong>{row.learner_name}</strong> for <strong>{row.course_title}</strong> on {formatDate(row.issued_at)}.
    </Notice>
  ) : (
    <Notice tone="error" title="Not found">
      No certificate with number {value} was found.
    </Notice>
  );
}

export default function VerifyPage({ searchParams }: PageProps<"/certificates/verify">) {
  return (
    <>
      <PageHeader eyebrow="Certificates" title="Verify a certificate" description="Enter the certificate number printed on a BDIM certificate of completion." />
      <Container className="max-w-xl py-12">
        <form className="flex gap-2" action="/certificates/verify">
          <label htmlFor="cert-number" className="sr-only">
            Certificate number
          </label>
          <Input id="cert-number" name="number" placeholder="BDIM-XXXXXXXXXX" className="font-mono uppercase" />
          <Button type="submit" variant="teal">
            Verify
          </Button>
        </form>
        <div className="mt-6">
          <Suspense fallback={<div className="h-16 animate-pulse rounded-xl bg-surface-2" />}>
            <Result searchParams={searchParams as Promise<{ number?: string }>} />
          </Suspense>
        </div>
      </Container>
    </>
  );
}
