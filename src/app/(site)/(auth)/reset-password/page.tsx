import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { Container } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-navy-950">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">Enter a new password for your account.</p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </Container>
  );
}
