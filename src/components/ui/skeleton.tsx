import { Container } from "./layout";

/** Neutral loading state for pages whose content depends on the URL. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="border-b border-line bg-surface">
        <Container className="py-14">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-10 w-2/3 animate-pulse rounded-lg bg-surface-2" />
          <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-surface-2" />
        </Container>
      </div>
      <Container className="grid gap-4 py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </Container>
    </div>
  );
}
