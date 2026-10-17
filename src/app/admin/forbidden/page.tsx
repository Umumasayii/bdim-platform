import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <main id="main" className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <h1 className="text-3xl font-bold text-navy-950">You don&apos;t have access to this area</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">Staff access is granted by a BDIM administrator. If you think this is a mistake, contact an administrator.</p>
        <ButtonLink href="/" className="mt-8">
          Back to site
        </ButtonLink>
      </div>
    </main>
  );
}
