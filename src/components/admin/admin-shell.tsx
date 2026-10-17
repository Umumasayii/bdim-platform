"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, HelpCircle, Inbox, LayoutDashboard, Library, LogOut, Map, MessageSquareQuote, UserRound, Users } from "lucide-react";
import { localAdminLogout } from "@/app/actions/admin";
import { useLearner } from "@/lib/learner/provider";
import { LogoMark } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const nav: { href: string; label: string; icon: typeof BookOpen; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/courses", label: "Courses & lessons", icon: BookOpen },
  { href: "/admin/library", label: "Library (books & notes)", icon: Library },
  { href: "/admin/assignments", label: "Assignments & grades", icon: ClipboardCheck },
  { href: "/admin/questions", label: "Questions", icon: HelpCircle },
  { href: "/admin/paths", label: "Learning paths", icon: Map },
  { href: "/admin/learners", label: "Enrollment requests", icon: GraduationCap },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, adminOnly: true },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox, adminOnly: true },
  { href: "/admin/instructors", label: "Instructors", icon: UserRound, adminOnly: true },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote, adminOnly: true },
];

export function AdminShell({ viewer, children }: { viewer: { name: string; role: Role; local: boolean }; children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useLearner();
  return (
    <div className="grid flex-1 lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-navy-950 text-navy-100 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <LogoMark className="size-9" onDark />
          <span className="text-sm font-bold text-white">BDIM Admin</span>
          <ThemeToggle className="ml-auto border-white/20 text-white hover:bg-white/10" />
        </div>
        <nav aria-label="Admin">
          <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            {nav
              .filter((n) => !n.adminOnly || viewer.role === "admin")
              .map((n) => {
                const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                        active ? "bg-white/10 font-semibold text-white" : "hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <n.icon className="size-4" aria-hidden /> {n.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-xs lg:block">
          <p className="font-medium text-white">{viewer.name}</p>
          <p className="capitalize text-navy-300">{viewer.local ? "Local dev admin" : viewer.role}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="hover:text-white">
              View site
            </Link>
            {viewer.local ? (
              <form action={localAdminLogout}>
                <button type="submit" className="inline-flex items-center gap-1 hover:text-white">
                  <LogOut className="size-3.5" aria-hidden /> Sign out
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-1 hover:text-white">
                <LogOut className="size-3.5" aria-hidden /> Sign out
              </button>
            )}
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
