"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown, Code2, Compass, Network, Route, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = { compass: Compass, network: Network, route: Route, code: Code2 };

export type ExploreItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: keyof typeof icons;
  /** Render the panel on a dark background (content styled for dark). */
  dark?: boolean;
  content: ReactNode;
};

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/**
 * Homepage sections as a 2×2 grid of cards. "Show" opens that card's content
 * in a full-width panel under the grid (one at a time). Every panel stays in
 * the HTML for search engines; linking to #<id> opens it.
 */
export function ExploreGrid({ items }: { items: ExploreItem[] }) {
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const active = picked === undefined ? (items.some((i) => i.id === hash) ? hash : null) : picked;
  const panel = useRef<HTMLDivElement>(null);
  const scrollOnOpen = useRef(false);

  useEffect(() => {
    if (!active || !scrollOnOpen.current) return;
    scrollOnOpen.current = false;
    const el = panel.current;
    // On narrow screens the panel can be far below the card that opened it.
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  const toggle = (id: string) => {
    scrollOnOpen.current = active !== id;
    setPicked(active === id ? null : id);
  };

  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const open = active === item.id;
          return (
            <li key={item.id} id={item.id} className="scroll-mt-24">
              <article
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] transition sm:p-6",
                  open ? "border-teal-400 ring-2 ring-teal-100" : "border-line hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-lift)]",
                )}
              >
                <div className="flex items-start gap-4">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl transition-colors", open ? "bg-teal-600 text-white" : "bg-navy-800 text-teal-200")}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{item.eyebrow}</p>
                    <h2 className="mt-1.5 text-xl font-bold leading-snug text-navy-950 sm:text-2xl">{item.title}</h2>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted sm:text-base">{item.description}</p>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={open}
                  aria-controls={`${item.id}-panel`}
                  className={cn(
                    "mt-5 inline-flex h-10 items-center gap-2 self-start rounded-full px-4 text-sm font-semibold transition-colors",
                    open ? "bg-teal-600 text-white hover:bg-teal-700" : "border border-line text-navy-900 hover:border-teal-400 hover:bg-surface",
                  )}
                >
                  {open ? "Hide" : "Show"}
                  <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      <div ref={panel} className="scroll-mt-24">
        {items.map((item) => (
          <section
            key={item.id}
            id={`${item.id}-panel`}
            aria-label={item.title}
            hidden={active !== item.id}
            className={cn(
              "mt-6 rounded-3xl border p-5 sm:p-8",
              item.dark ? "border-navy-800 bg-navy-950 text-white dark:border-[#223a5e] dark:bg-[#0f2140]" : "border-line bg-surface",
            )}
          >
            {item.content}
          </section>
        ))}
      </div>
    </div>
  );
}
