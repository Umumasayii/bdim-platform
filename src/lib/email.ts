import "server-only";

/*
  Email notifications via Resend's HTTP API, when configured:
    RESEND_API_KEY, EMAIL_FROM (a verified sender), BDIM_NOTIFICATION_EMAIL
  Without configuration nothing is sent and callers report that honestly.
*/
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured() || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function notifyStaff(subject: string, text: string) {
  return sendEmail(process.env.BDIM_NOTIFICATION_EMAIL ?? "", subject, text);
}
