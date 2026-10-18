import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/config";

/*
  Outgoing email. Two providers, picked from environment variables:

  1. SMTP (e.g. Gmail with an App Password) — works without owning a domain:
       SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
       SMTP_USER=you@gmail.com   SMTP_PASS=<16-character app password>
  2. Resend's HTTP API — once BDIM has a verified domain:
       RESEND_API_KEY=...

  Plus, for either:
       EMAIL_FROM="Big Data IQ Minds <you@gmail.com>"   (defaults to SMTP_USER)
       BDIM_NOTIFICATION_EMAIL=where staff alerts go     (defaults to the from address)

  With neither configured nothing is sent, and callers say so honestly.
*/

type Provider = "smtp" | "resend" | null;

function provider(): Provider {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return null;
}

const fromAddress = () => process.env.EMAIL_FROM || (process.env.SMTP_USER ? `${site.name} <${process.env.SMTP_USER}>` : "");
const staffAddress = () => process.env.BDIM_NOTIFICATION_EMAIL || process.env.SMTP_USER || "";

export const emailConfigured = () => provider() !== null;

let transporter: Transporter | null = null;
function smtp() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/* Signature added to the end of every email: logo, company name and phone. */
const signatureName = site.shortLegalName;
const signaturePhone = site.contact.whatsapp;

const signatureText = () => ["--", signatureName, `Tel: ${signaturePhone}`].join("\n");

function signatureHtml() {
  const tel = signaturePhone.replace(/[^\d+]/g, "");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e2e7ee;padding-top:16px"><tr>
<td style="vertical-align:middle;padding-right:14px"><img src="${siteUrl}/brand/bdim-mark-128.png" width="56" height="56" alt="BDIM" style="display:block;border-radius:12px;border:1px solid #e2e7ee"></td>
<td style="vertical-align:middle;font-size:14px;line-height:1.5;color:#061d42">
<div style="font-weight:800;font-size:16px">${escapeHtml(signatureName)}</div>
<div>Tel: <a href="tel:${tel}" style="color:#077a70;text-decoration:none">${escapeHtml(signaturePhone)}</a></div>
</td></tr></table>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text → simple branded HTML (paragraphs, line breaks, clickable links). */
function toHtml(text: string) {
  const body = text
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      const withLinks = escapeHtml(para).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#077a70">$1</a>');
      return `<p style="margin:0 0 14px;line-height:1.6">${withLinks.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Segoe UI,Arial,sans-serif;color:#061d42">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e7ee;border-radius:14px;overflow:hidden">
<tr><td style="background:#052553;padding:18px 24px">
<img src="${siteUrl}/brand/bdim-mark-128.png" width="36" height="36" alt="" style="vertical-align:middle;background:#fff;border-radius:8px;padding:3px">
<span style="vertical-align:middle;margin-left:10px;color:#ffffff;font-weight:800;font-size:17px">Big Data <span style="color:#3cbf71">IQ</span> Minds</span>
</td></tr>
<tr><td style="padding:24px;font-size:15px">${body}${signatureHtml()}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e2e7ee;font-size:12px;color:#4d5f7a">${escapeHtml(site.legalName)} · ${escapeHtml(site.location)} · <a href="${siteUrl}" style="color:#077a70">${siteUrl.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  const kind = provider();
  if (!kind || !to) return false;
  try {
    if (kind === "smtp") {
      await smtp().sendMail({ from: fromAddress(), to, subject, text: `${text}\n\n${signatureText()}`, html: toHtml(text), replyTo });
      return true;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, text: `${text}\n\n${signatureText()}`, html: toHtml(text), reply_to: replyTo }),
    });
    return res.ok;
  } catch (err) {
    console.error("Email send failed:", (err as Error).message);
    return false;
  }
}

/** Alert BDIM staff. Pass the customer's address as replyTo so staff can answer directly. */
export function notifyStaff(subject: string, text: string, replyTo?: string) {
  return sendEmail(staffAddress(), subject, text, replyTo);
}
