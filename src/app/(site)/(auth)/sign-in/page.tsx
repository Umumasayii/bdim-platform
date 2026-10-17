import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/forms/auth-forms";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-navy-950">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to continue learning.</p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-2" />}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
