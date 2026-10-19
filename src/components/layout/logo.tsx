import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
  Official BDIM mark, cropped from public/brand/bdim-logo.png (the full logo
  with wordmark). The wordmark next to it is live text styled to match the
  logo — "IQ" in green — so it stays crisp at every size.
*/
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn("relative inline-grid size-10 shrink-0 place-items-center", onDark ? "rounded-xl bg-white p-1" : "dark:rounded-xl dark:bg-white dark:p-1", className)}>
      <Image src="/brand/bdim-mark-128.png" alt="" width={128} height={128} className="size-full object-contain" priority />
    </span>
  );
}

export function Wordmark({ inverted = false, compact = false, className }: { inverted?: boolean; compact?: boolean; className?: string }) {
  return (
    <span className={cn("min-w-0 whitespace-nowrap leading-none", className)}>
      <span className={cn("block truncate font-extrabold tracking-tight", compact ? "text-[15px] sm:text-[16px]" : "text-[16px]", inverted ? "text-white" : "text-navy-900")}>
        Big Data <span className={inverted ? "text-leaf-400" : "text-leaf-600"}>IQ</span> Minds
      </span>
      <span
        className={cn(
          "mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.22em]",
          compact && "max-[419px]:hidden",
          inverted ? "text-navy-200" : "text-navy-700",
        )}
      >
        Data <span className="text-leaf-500">•</span> Insights <span className="text-leaf-500">•</span> Impact
      </span>
    </span>
  );
}

/** `compact`: the header on phones — smaller mark, no tagline below 420px, name can shorten with "…" on tiny screens. */
export function Logo({ className, inverted = false, compact = false }: { className?: string; inverted?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center", compact ? "gap-2 sm:gap-2.5" : "gap-2.5", className)} aria-label={`${site.name} — home`}>
      <LogoMark onDark={inverted} className={compact ? "size-9 sm:size-10" : undefined} />
      <Wordmark inverted={inverted} compact={compact} />
    </Link>
  );
}
