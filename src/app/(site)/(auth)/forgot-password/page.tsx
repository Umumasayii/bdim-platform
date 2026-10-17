import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-navy-950">Reset your password</h1>
        <p className="mt-1 text-sm text-muted">We&apos;ll email you a secure link.</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </Container>
  );
}
