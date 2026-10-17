"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Pencil } from "lucide-react";
import { useLearner } from "@/lib/learner/provider";

/** Public page → the admin screen that edits its content. */
const targets: [prefix: string, href: string, label: string][] = [
  ["/courses", "/admin/courses", "Edit courses & lessons"],
  ["/learn", "/admin/courses", "Edit courses & lessons"],
  ["/learning-paths", "/admin/paths", "Edit learning paths"],
  ["/library", "/admin/library", "Manage the library"],
  ["/questions", "/admin/questions", "Edit questions"],
  ["/practice", "/admin/questions", "Edit questions"],
  ["/live-training", "/admin/bookings", "See bookings"],
  ["/bookings", "/admin/bookings", "See bookings"],
  ["/consulting", "/admin/inquiries", "See inquiries"],
  ["/corporate-training", "/admin/inquiries", "See inquiries"],
  ["/contact", "/admin/inquiries", "See inquiries"],
  ["/about", "/admin/instructors", "Edit instructor profile"],
  ["/dashboard", "/admin/users", "See all users"],
];

function Bar() {
  const pathname = usePathname();
  const { state } = useLearner();
  if (!state.role) return null;
  const match = targets.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  const [, href, label] = match ?? ["", "/admin", "Open admin panel"];
  return (
    <Link
      href={href}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-lift)] hover:bg-navy-800 dark:bg-teal-600 dark:hover:bg-teal-700"
    >
      <Pencil className="size-4" aria-hidden /> {label}
    </Link>
  );
}

/** Floating shortcut for staff accounts on public pages. */
export function StaffBar() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
