"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/**
 * A page section whose body can be expanded or collapsed. The body stays in
 * the HTML (good for search engines); it is just hidden until opened.
 * Linking to #<id> opens it automatically.
 */
export function Collapsible({
  id,
  eyebrow,
  title,
  description,
  defaultOpen = false,
  tone = "light",
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  tone?: "light" | "dark";
  children: ReactNode;
  className?: string;
}) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const open = toggled ?? (hash === `#${id}` || defaultOpen);
  const bodyId = useId();
  const dark = tone === "dark";

  return (
    <div id={id} className={cn("scroll-mt-24", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", dark ? "text-teal-300" : "text-teal-600")}>{eyebrow}</p>
          ) : null}
          <h2 className={cn("mt-2 text-3xl font-bold sm:text-4xl", dark ? "text-white" : "text-navy-950")}>
            <button
              type="button"
              onClick={() => setToggled(!open)}
              aria-expanded={open}
              aria-controls={bodyId}
              className="text-left hover:underline hover:decoration-teal-400 hover:decoration-2 hover:underline-offset-8"
            >
              {title}
            </button>
          </h2>
          {description ? <p className={cn("mt-3 text-base leading-relaxed sm:text-lg", dark ? "text-navy-200" : "text-muted")}>{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setToggled(!open)}
          aria-expanded={open}
          aria-controls={bodyId}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full border px-4 text-sm font-semibold transition-colors md:self-auto",
            dark ? "border-white/20 text-white hover:bg-white/10" : "border-line bg-white text-navy-900 hover:border-teal-400",
          )}
        >
          {open ? "Hide" : "Show"}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      <div
        id={bodyId}
        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
        inert={!open}
      >
        <div className="overflow-hidden">
          <div className={cn("pt-10", !open && "invisible")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
