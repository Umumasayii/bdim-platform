import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { emailConfigured } from "@/lib/email";
import { getStore } from "@/lib/data/store";
import { currentTimeMs } from "@/lib/utils";
import { createUserClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/notice";

export const metadata = { title: "Overview" };

async function supabaseCounts() {
  if (!isSupabaseConfigured) return null;
  const db = await createUserClient();
  const count = async (table: string, filter?: [string, string]) => {
    let q = db.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [enrollments, requested, attempts, submissions] = await Promise.all([
    count("enrollments"),
    count("enrollments", ["status", "requested"]),
    count("practice_attempts"),
    count("assignment_submissions", ["status", "submitted"]),
  ]);
  return { enrollments, requested, attempts, submissions };
}

export default async function AdminOverview() {
  await connection();
  // Each page authorises itself: layouts do not block sibling page rendering.
  await requireStaffPage();
  const store = getStore();
  const [courses, questions, bookings, inquiries, settings, counts] = await Promise.all([
    store.listCourses({ includeUnpublished: true }),
    store.listQuestions({ includeUnpublished: true }),
    store.listBookings().catch(() => []),
    store.listInquiries().catch(() => []),
    store.getBookingSettings(),
    supabaseCounts(),
  ]);
  const nowMs = currentTimeMs();
  const upcoming = bookings.filter((b) => b.status !== "cancelled" && Date.parse(b.startsAt) > nowMs);
  const cards = [
    { label: "Published courses", value: courses.filter((c) => c.published).length, sub: `${courses.length} total`, href: "/admin/courses" },
    { label: "Published questions", value: questions.filter((q) => q.published).length, sub: `${questions.length} total`, href: "/admin/questions" },
    { label: "Pending bookings", value: bookings.filter((b) => b.status === "pending").length, sub: `${upcoming.length} upcoming`, href: "/admin/bookings" },
    { label: "New inquiries", value: inquiries.filter((i) => i.status === "new").length, sub: `${inquiries.length} total`, href: "/admin/inquiries" },
  ];
  return (
    <div className="grid gap-8">
      <h1 className="text-3xl font-bold text-navy-950">Overview</h1>
      <div className="grid gap-3">
        {!isSupabaseConfigured ? (
          <Notice tone="warning" title="Local data store">
            Supabase is not configured: content edits, bookings and inquiries are saved to <code>.data/bdim-db.json</code> on this machine, and
            learner progress stays in each learner&apos;s browser. Configure Supabase for production.
          </Notice>
        ) : null}
        {!settings.reviewed ? (
          <Notice tone="warning" title="Booking schedule not reviewed">
            The weekly availability is still the default. <Link href="/admin/bookings" className="font-semibold underline">Review and save it</Link> before launch.
          </Notice>
        ) : null}
        {!emailConfigured() ? <Notice tone="info">Email notifications are off (set RESEND_API_KEY and EMAIL_FROM to enable them).</Notice> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-line bg-white p-5 hover:border-teal-300">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-navy-950">{c.value}</p>
            <p className="text-xs text-muted">{c.sub}</p>
          </Link>
        ))}
      </div>
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="font-bold text-navy-950">Engagement</h2>
        {counts ? (
          <dl className="mt-3 grid gap-4 sm:grid-cols-4">
            {[
              ["Enrollments", counts.enrollments],
              ["Awaiting approval", counts.requested],
              ["Practice attempts", counts.attempts],
              ["Assignments to review", counts.submissions],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-2xl font-bold text-navy-950">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">Enrollment and engagement statistics are available once learner accounts (Supabase) are configured.</p>
        )}
      </section>
    </div>
  );
}
