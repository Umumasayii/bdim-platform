"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_KEY } from "@/lib/theme";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Current theme, kept in sync with the <html class="dark"> flag. */
export function useIsDark() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

export function setTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode: the choice lasts for this page view only.
  }
}

export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-line text-navy-900 transition-colors hover:bg-surface",
        withLabel ? "px-3 text-sm font-medium" : "w-9",
        className,
      )}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      {withLabel ? <span>{dark ? "Light mode" : "Dark mode"}</span> : null}
    </button>
  );
}
