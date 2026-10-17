import type { Metadata } from "next";
import { SignUpForm } from "@/components/forms/auth-forms";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-navy-950">Create your BDIM account</h1>
        <p className="mt-1 text-sm text-muted">Track progress, save questions and join discussions.</p>
        <div className="mt-6">
          <SignUpForm />
        </div>
      </div>
    </Container>
  );
}
