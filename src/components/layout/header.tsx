"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { navGroups } from "@/lib/site";
import { useLearner } from "@/lib/learner/provider";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "./avatar";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Closes a popup on outside click or Escape. */
function useDismiss(open: boolean, setOpen: (v: boolean) => void, ref: RefObject<HTMLElement | null>) {
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
  }, [open, setOpen, ref]);
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { mode, user, signOut, ready, state } = useLearner();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, setOpen, ref);

  if (!ready) return <div className="h-9 w-32" aria-hidden />;

  if (mode === "member" && user) {
    const fullName = state.profile.fullName.trim();
    const firstName = fullName.split(/\s+/)[0] || user.email.split("@")[0];
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Account menu for ${fullName || user.email}`}
          className="flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white py-0.5 pl-0.5 pr-2.5 text-sm font-medium text-navy-900 hover:bg-surface"
        >
          <Avatar src={state.profile.avatarUrl} name={fullName || user.email} className="size-8" />
          <span className="max-w-28 truncate">{firstName}</span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </button>
        {open ? (
          <div role="menu" className={cn("absolute z-50 mt-2 w-60 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-lift)]", compact ? "left-0" : "right-0")}>
            <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
              <Avatar src={state.profile.avatarUrl} name={fullName || user.email} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{fullName || firstName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                {state.role ? <p className="mt-0.5 text-xs font-semibold capitalize text-teal-700">{state.role}</p> : null}
              </div>
            </div>
            {state.role ? (
              <Link role="menuitem" href="/admin" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-surface" onClick={() => setOpen(false)}>
                <ShieldCheck className="size-4" aria-hidden /> Admin panel
              </Link>
            ) : null}
            <Link role="menuitem" href="/dashboard" className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface", !state.role && "mt-1")} onClick={() => setOpen(false)}>
              <LayoutDashboard className="size-4" aria-hidden /> My learning
            </Link>
            <Link role="menuitem" href="/dashboard?tab=profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface" onClick={() => setOpen(false)}>
              <UserRound className="size-4" aria-hidden /> Profile & photo
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
    <div className="flex items-center gap-2 whitespace-nowrap">
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

/** Admin shortcut in the top bar, shown only to staff accounts. */
function AdminLink() {
  const { state } = useLearner();
  if (!state.role) return null;
  return (
    <Link href="/admin" className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700">
      <ShieldCheck className="size-4" aria-hidden /> Admin
    </Link>
  );
}

function NavMenu({ group, pathname }: { group: (typeof navGroups)[number]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useDismiss(open, setOpen, ref);
  const active = group.items.some((n) => isActive(pathname, n.href));
  const id = `nav-${group.label.toLowerCase()}`;
  return (
    <li
      className="relative"
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && (clearTimeout(timer.current), setOpen(true))}
      onPointerLeave={(e) => e.pointerType === "mouse" && (timer.current = setTimeout(() => setOpen(false), 150))}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        // Hover already opened it for mouse users, so a click keeps it open; the keyboard (detail 0) toggles.
        onClick={(e) => setOpen((v) => (e.detail === 0 ? !v : true))}
        className={cn(
          "flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active || open ? "bg-navy-50 text-navy-900" : "text-muted hover:text-navy-900",
        )}
      >
        {group.label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div id={id} className="absolute left-0 top-full z-50 pt-2">
          <ul className="w-80 rounded-2xl border border-line bg-white p-2 shadow-[var(--shadow-lift)]">
            {group.items.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, n.href) ? "page" : undefined}
                  className={cn("block rounded-xl px-3 py-2.5 hover:bg-surface", isActive(pathname, n.href) && "bg-surface")}
                >
                  <span className="block text-sm font-semibold text-navy-900">{n.label}</span>
                  <span className="block text-xs text-muted">{n.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
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
    <>
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Container className="flex h-16 max-w-[96rem] items-center justify-between gap-3">
        <Logo className="shrink-0" />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navGroups.map((g) => (
              <NavMenu key={g.label} group={g} pathname={pathname} />
            ))}
          </ul>
        </nav>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <AdminLink />
          <ThemeToggle />
          <NotificationBell />
          <AccountMenu />
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />
          <ThemeToggle />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl border border-line text-navy-900"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </Container>
    </header>

      {/* Outside <header>: its backdrop-filter would make it the containing block for this fixed panel. */}
      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-white lg:hidden">
          <Container className="py-4">
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-4">
              <AccountMenu compact />
              <AdminLink />
            </div>
            <nav aria-label="Mobile" className="grid gap-5 sm:grid-cols-2">
              {navGroups.map((g) => (
                <div key={g.label}>
                  <p className="px-4 text-xs font-bold uppercase tracking-wider text-muted">{g.label}</p>
                  <ul className="mt-1 grid">
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive(pathname, item.href) ? "page" : undefined}
                          className={cn(
                            "block rounded-xl px-4 py-2.5 text-base font-medium",
                            isActive(pathname, item.href) ? "bg-navy-50 text-navy-900" : "text-navy-800 hover:bg-surface",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}
    </>
  );
}
