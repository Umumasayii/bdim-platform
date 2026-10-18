import { timingSafeEqual } from "node:crypto";
import { dispatchNotificationEmails, sendInactivityEmails } from "@/lib/notifications";
import { emailSettings } from "@/lib/email";

/*
  Daily job, run by Vercel Cron (see vercel.json). Vercel sends
  "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
  1. Sends any notification emails still waiting in the queue.
  2. Emails learners who haven't visited for 7 days.
*/
export const maxDuration = 60;

function authorised(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const notificationEmails = await dispatchNotificationEmails(200);
  const inactivityEmails = await sendInactivityEmails(Date.now());
  return Response.json({ notificationEmails, inactivityEmails, ...emailSettings() });
}
