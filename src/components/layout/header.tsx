"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { mainNav } from "@/lib/site";
import { useLearner } from "@/lib/learner/provider";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function AccountMenu() {
  const { mode, user, signOut, ready } = useLearner();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!ready) return <div className="h-9 w-40" aria-hidden />;

  if (mode === "member" && user) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white pl-1 pr-2.5 text-sm font-medium text-navy-900 hover:bg-surface"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-teal-600 text-xs font-bold uppercase text-white">
            {user.email.slice(0, 1)}
          </span>
          <span className="max-w-32 truncate">{user.email}</span>
          <ChevronDown className="size-4 text-muted" aria-hidden />
        </button>
        {open ? (
          <div role="menu" className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]">
            <Link role="menuitem" href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface" onClick={() => setOpen(false)}>
              <LayoutDashboard className="size-4" aria-hidden /> My learning
            </Link>
            <button role="menuitem" type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {mode === "demo" ? (
        <Link href="/dashboard" className={buttonClass("ghost", "sm")}>
          My learning
        </Link>
      ) : (
        <Link href="/sign-in" className={buttonClass("ghost", "sm")}>
          Sign In
        </Link>
      )}
      <Link href={mode === "demo" ? "/courses" : "/sign-up"} className={buttonClass("teal", "sm")}>
        Get Started
      </Link>
    </div>
  );
}

/** Header with active-link state. URL data is read inside Suspense so routes can prerender. */
export function Header() {
  return (
    <Suspense fallback={<HeaderView pathname="" />}>
      <HeaderWithPath />
    </Suspense>
  );
}

function HeaderWithPath() {
  return <HeaderView pathname={usePathname()} />;
}

function HeaderView({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile menu after navigation.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                    isActive(pathname, item.href) ? "bg-navy-50 text-navy-900" : "text-muted hover:text-navy-900",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden xl:block">
          <AccountMenu />
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-line text-navy-900 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </Container>

      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-white xl:hidden">
          <Container className="py-4">
            <nav aria-label="Mobile">
              <ul className="grid gap-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className={cn(
                        "block rounded-xl px-4 py-3 text-base font-medium",
                        isActive(pathname, item.href) ? "bg-navy-50 text-navy-900" : "text-navy-800 hover:bg-surface",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 border-t border-line pt-4">
              <AccountMenu />
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
