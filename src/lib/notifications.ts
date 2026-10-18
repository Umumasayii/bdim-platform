import "server-only";
import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { emailConfigured, notifyStaff, sendEmail } from "@/lib/email";
import { getStore } from "@/lib/data/store";
import { createServiceClient } from "@/lib/supabase/server";

/*
  Notifications are written by database triggers (see the notifications
  migration). This module only sends the ones flagged for email, and the
  7-day "we miss you" email. Both claim rows atomically in SQL, so running
  them from several places at once never sends anything twice.
*/

const firstName = (fullName: string, email: string) => fullName.trim().split(/\s+/)[0] || email.split("@")[0];
const profileLink = `${siteUrl}/dashboard?tab=profile`;
const footer = `You get these emails because you have a Big Data IQ Minds account. To stop them, untick "Email me about my activity" in your profile: ${profileLink}`;

type QueuedEmail = { id: string; kind: string; title: string; body: string; link: string; email: string; full_name: string; opted_out: boolean };

/** Sends queued notification emails. Returns how many were sent. */
export async function dispatchNotificationEmails(limit = 50): Promise<number> {
  if (!isSupabaseConfigured || !emailConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const { data, error } = await createServiceClient().rpc("claim_notification_emails", { p_limit: limit });
  if (error) {
    console.error("Notification email claim failed:", error.message);
    return 0;
  }
  let sent = 0;
  const staffAlerts = new Set<string>();
  for (const n of (data ?? []) as QueuedEmail[]) {
    // Staff alerts: one email per alert to the BDIM inbox, not to each staff member.
    if (n.kind.startsWith("staff_")) {
      const key = [n.kind, n.title, n.body, n.link].join("|");
      if (staffAlerts.has(key)) continue;
      staffAlerts.add(key);
      if (await notifyStaff(n.title, `${n.body}

Open it here: ${n.link ? `${siteUrl}${n.link}` : siteUrl}`)) sent++;
      continue;
    }
    if (n.opted_out || !n.email) continue;
    const link = n.link ? `${siteUrl}${n.link}` : siteUrl;
    const ok = await sendEmail(
      n.email,
      n.title,
      `Dear ${firstName(n.full_name, n.email)},\n\n${n.title}.\n\n${n.body}\n\nOpen it here: ${link}\n\nBest regards,\nThe Big Data IQ Minds team\n\n${footer}`,
    );
    if (ok) sent++;
  }
  return sent;
}

type InactiveLearner = { id: string; email: string; full_name: string; last_seen_at: string };

const daysSince = (iso: string, nowMs: number) => Math.max(1, Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000));

/** Emails learners who haven't visited for `days` days (once per absence). Returns how many were sent. */
export async function sendInactivityEmails(nowMs: number, days = 7, limit = 100): Promise<number> {
  if (!isSupabaseConfigured || !emailConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const db = createServiceClient();
  const { data, error } = await db.rpc("claim_inactive_learners", { p_days: days, p_limit: limit });
  if (error) {
    console.error("Inactive learner claim failed:", error.message);
    return 0;
  }
  const learners = (data ?? []) as InactiveLearner[];
  if (!learners.length) return 0;

  const ids = learners.map((l) => l.id);
  const [courses, { data: enrollments }, { data: progress }, { count: newItems }] = await Promise.all([
    getStore().listCourses(),
    db.from("enrollments").select("user_id, course_id").in("user_id", ids).eq("status", "active"),
    db.from("lesson_progress").select("user_id, lesson_id").in("user_id", ids),
    db.from("library_items").select("id", { count: "exact", head: true }).eq("published", true).gte("created_at", new Date(nowMs - days * 86_400_000).toISOString()),
  ]);
  const done = new Set((progress ?? []).map((p) => `${p.user_id}:${p.lesson_id}`));

  let sent = 0;
  for (const l of learners) {
    const name = firstName(l.full_name, l.email);
    const away = daysSince(l.last_seen_at, nowMs);
    const inProgress = (enrollments ?? [])
      .filter((e) => e.user_id === l.id)
      .map((e) => courses.find((c) => c.id === e.course_id))
      .filter((c) => c !== undefined)
      .map((c) => {
        const lessons = c.modules.flatMap((m) => m.lessons);
        const completed = lessons.filter((x) => done.has(`${l.id}:${x.id}`)).length;
        const next = lessons.find((x) => !done.has(`${l.id}:${x.id}`));
        const pct = lessons.length ? Math.round((100 * completed) / lessons.length) : 0;
        return { c, pct, next };
      })
      .filter((x) => x.pct < 100);

    const courseLines = inProgress.length
      ? `Here's where you left off:\n\n${inProgress
          .slice(0, 3)
          .map(({ c, pct, next }) => `• ${c.title}: ${pct}% complete${next ? `\n  Next lesson: "${next.title}" — ${siteUrl}/learn/${c.slug}/${next.id}` : ""}`)
          .join("\n\n")}`
      : `You haven't started a course yet. Browse our courses and pick one that matches your goals: ${siteUrl}/courses`;
    const libraryLine = newItems ? `\n\nWhile you were away, ${newItems} new ${newItems === 1 ? "resource was" : "resources were"} added to the library: ${siteUrl}/library` : "";

    const ok = await sendEmail(
      l.email,
      `${name}, we miss you at Big Data IQ Minds`,
      `Dear ${name},\n\nIt's been ${away} days since your last visit to Big Data IQ Minds, and we wanted to check in. Learning data skills works best a little at a time — even 15 minutes today keeps your progress going.\n\n${courseLines}${libraryLine}\n\nYou can also sharpen your skills in the free practice zone: ${siteUrl}/practice\n\nNeed help or have a question? Just reply to this email — we're happy to help.\n\nKeep going,\nThe Big Data IQ Minds team\nWe Turn Data Into Decisions.\n\n${footer}`,
    );
    if (ok) sent++;
  }
  return sent;
}
