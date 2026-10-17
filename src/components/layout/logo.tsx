import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
  Placeholder brand mark. When the official BDIM logo is available, put it in
  public/brand/ and set NEXT_PUBLIC_LOGO_URL (e.g. /brand/bdim-logo.svg) — it
  is rendered as-is, preserving its proportions.
*/
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--color-navy-800)" />
      <rect x="9" y="22" width="5" height="9" rx="1.5" fill="var(--color-teal-400)" />
      <rect x="17.5" y="16" width="5" height="15" rx="1.5" fill="var(--color-teal-300)" />
      <rect x="26" y="10" width="5" height="21" rx="1.5" fill="var(--color-leaf-400)" />
      <circle cx="28.5" cy="8.5" r="2.4" fill="#fff" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label={`${site.name} — home`}>
      {site.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo may be any format/size supplied by BDIM
        <img src={site.logoUrl} alt={site.name} className="h-9 w-auto object-contain" />
      ) : (
        <>
          <LogoMark />
          <span className="leading-none">
            <span className={cn("block text-[15px] font-bold tracking-tight", inverted ? "text-white" : "text-navy-900")}>
              Big Data IQ Minds
            </span>
            <span className={cn("block text-[10px] font-medium uppercase tracking-[0.16em]", inverted ? "text-teal-200" : "text-teal-600")}>
              Data • Insights • Impact
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
