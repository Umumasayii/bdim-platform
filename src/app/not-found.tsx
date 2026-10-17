import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-24 text-center">
        <div>
          <p className="font-mono text-sm font-semibold text-teal-600">404</p>
          <h1 className="mt-2 text-4xl font-bold text-navy-950">We couldn&apos;t find that page</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">The link may be out of date, or the page may have moved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/">Go home</ButtonLink>
            <ButtonLink href="/courses" variant="outline">
              Browse courses
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-muted">
            Need help? <Link href="/contact" className="font-medium text-teal-700 underline">Contact us</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
