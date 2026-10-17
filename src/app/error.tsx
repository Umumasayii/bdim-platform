"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <div>
        <p className="font-mono text-sm font-semibold text-red-600">Something went wrong</p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">This page couldn&apos;t be loaded</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">Please try again. If the problem continues, contact us{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="outline">
            Go home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
