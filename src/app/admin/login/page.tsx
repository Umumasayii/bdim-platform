import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/config";
import { isLocalAdminEnabled } from "@/lib/auth/local-admin";
import { Logo } from "@/components/layout/logo";
import { Notice } from "@/components/ui/notice";
import { ButtonLink } from "@/components/ui/button";
import { LocalAdminLoginForm } from "@/components/admin/local-login-form";

export const metadata = { title: "Admin sign-in" };

export default function AdminLoginPage() {
  return (
    <main id="main" className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-[var(--shadow-card)]">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-navy-950">Admin sign-in</h1>
        {isSupabaseConfigured ? (
          <div className="mt-4 grid gap-4">
            <p className="text-sm text-muted">Sign in with your staff account. Access is granted by an administrator in the database.</p>
            <ButtonLink href="/sign-in?next=/admin" variant="teal">
              Continue to sign-in
            </ButtonLink>
          </div>
        ) : isLocalAdminEnabled() ? (
          <div className="mt-4 grid gap-4">
            <Notice tone="warning">
              Local development admin. Changes are saved to the local data file. Configure Supabase for production use.
            </Notice>
            <LocalAdminLoginForm />
          </div>
        ) : (
          <Notice tone="info" title="Admin access is not configured" className="mt-4">
            Set <code>LOCAL_ADMIN_PASSWORD</code> (8+ characters) and <code>ADMIN_SESSION_SECRET</code> (32+ characters) in{" "}
            <code>.env.local</code> for local development, or configure Supabase and grant a staff role. See the README.
          </Notice>
        )}
        <p className="mt-6 text-sm">
          <Link href="/" className="text-teal-700 hover:underline">
            ← Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}
