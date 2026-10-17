"use server";

import { getStore } from "@/lib/data/store";
import { computeSlots, type SlotDay } from "@/lib/booking";
import { emailConfigured, notifyStaff, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/config";
import type { Booking, Inquiry } from "@/lib/types";
import { formatDateTime, makeReference, randomToken } from "@/lib/utils";
import { bookingSchema, fieldErrors, inquirySchema, type BookingInput, type InquiryInput } from "@/lib/validation";

type Failure = { ok: false; message: string; errors?: Record<string, string> };

// ───────────────────────── Inquiries ─────────────────────────
export async function submitInquiry(
  input: InquiryInput,
): Promise<{ ok: true; reference: string; emailed: boolean } | Failure> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", errors: fieldErrors(parsed.error) };
  const now = Date.now();
  if (!(await rateLimit("inquiry", 5, 10 * 60_000, now))) {
    return { ok: false, message: "Too many submissions from this connection. Please try again in a few minutes." };
  }
  const v = parsed.data;
  const iso = new Date(now).toISOString();
  const inquiry: Inquiry = {
    id: crypto.randomUUID(),
    reference: makeReference("INQ"),
    kind: v.kind,
    serviceCategory: v.serviceCategory,
    courseSlug: v.courseSlug,
    name: v.name,
    email: v.email,
    phone: v.phone,
    organization: v.organization,
    description: v.description,
    deadline: v.deadline,
    participants: v.participants,
    consent: true,
    status: "new",
    adminNote: "",
    createdAt: iso,
    updatedAt: iso,
  };
  try {
    await getStore().createInquiry(inquiry);
  } catch (err) {
    return { ok: false, message: `Your request could not be saved: ${(err as Error).message}` };
  }
  const summary = `Reference: ${inquiry.reference}\nType: ${inquiry.kind}\nTopic: ${inquiry.serviceCategory || inquiry.courseSlug || "-"}\nFrom: ${inquiry.name} <${inquiry.email}>\nOrganization: ${inquiry.organization || "-"}\n\n${inquiry.description}`;
  const [staff, customer] = await Promise.all([
    notifyStaff(
      `New inquiry ${inquiry.reference}: ${inquiry.serviceCategory || inquiry.courseSlug || inquiry.kind}`,
      `${summary}\n\nManage it: ${siteUrl}/admin/inquiries`,
      inquiry.email,
    ),
    sendEmail(
      inquiry.email,
      `We received your request (${inquiry.reference})`,
      `Hello ${inquiry.name},\n\nThank you for contacting Big Data IQ Minds. We have received your request (reference ${inquiry.reference}) and will reply by email.\n\n— BDIM`,
    ),
  ]);
  return { ok: true, reference: inquiry.reference, emailed: staff || customer };
}

// ───────────────────────── Bookings ─────────────────────────
async function loadSlots(serviceId: string, nowMs: number, ignore?: Pick<Booking, "startsAt" | "instructorId">) {
  const store = getStore();
  const [services, settings] = await Promise.all([store.listBookableServices(), store.getBookingSettings()]);
  const service = services.find((s) => s.id === serviceId);
  if (!service) return { service: null, settings, days: [] as SlotDay[] };
  const from = new Date(nowMs).toISOString();
  const to = new Date(nowMs + (settings.horizonDays + 2) * 86_400_000).toISOString();
  let busy = await store.listBusyIntervals(from, to);
  if (ignore) {
    // When rescheduling, the booking's own current slot doesn't block it.
    busy = busy.filter((b) => !(Date.parse(b.startsAt) === Date.parse(ignore.startsAt) && b.instructorId === ignore.instructorId));
  }
  const days = computeSlots({ settings, durationMinutes: service.durationMinutes, instructorId: service.instructorId, busy, nowMs });
  return { service, settings, days };
}

export async function getAvailableSlots(serviceId: string): Promise<{ ok: true; days: SlotDay[]; timeZoneLabel: string } | Failure> {
  try {
    const { service, settings, days } = await loadSlots(serviceId, Date.now());
    if (!service) return { ok: false, message: "This service is not available." };
    if (!settings.enabled) return { ok: false, message: "Online booking is currently closed. Please send us a request instead." };
    return { ok: true, days, timeZoneLabel: settings.timeZoneLabel };
  } catch (err) {
    return { ok: false, message: `Availability could not be loaded: ${(err as Error).message}` };
  }
}

export async function createBooking(
  input: BookingInput,
): Promise<{ ok: true; reference: string; status: Booking["status"]; manageUrl: string; when: string; emailed: boolean } | Failure> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", errors: fieldErrors(parsed.error) };
  const now = Date.now();
  if (!(await rateLimit("booking", 5, 10 * 60_000, now))) {
    return { ok: false, message: "Too many booking attempts from this connection. Please try again later." };
  }
  const v = parsed.data;
  const { service, settings, days } = await loadSlots(v.serviceId, now);
  if (!service || !settings.enabled) return { ok: false, message: "This service cannot be booked online right now." };
  const slot = days.flatMap((d) => d.slots).find((s) => s.startsAt === new Date(v.startsAt).toISOString());
  if (!slot) return { ok: false, message: "That time is no longer available. Please pick another slot." };

  const iso = new Date(now).toISOString();
  const booking: Booking = {
    id: crypto.randomUUID(),
    reference: makeReference("BK"),
    serviceId: service.id,
    instructorId: service.instructorId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    name: v.name,
    email: v.email,
    phone: v.phone,
    organization: v.organization,
    notes: v.notes,
    status: settings.autoConfirm ? "confirmed" : "pending",
    manageToken: randomToken(),
    userId: null,
    createdAt: iso,
    updatedAt: iso,
    adminNote: "",
  };
  let result;
  try {
    result = await getStore().createBooking(booking);
  } catch (err) {
    return { ok: false, message: `Your booking could not be saved: ${(err as Error).message}` };
  }
  if (!result.ok) return { ok: false, message: result.message };

  const when = `${formatDateTime(booking.startsAt, settings.utcOffset)} (${settings.timeZoneLabel})`;
  const manageUrl = `/bookings/${booking.manageToken}`;
  const statusLine = booking.status === "confirmed" ? "Your session is confirmed." : "Your request is pending confirmation by BDIM.";
  const [customer, staff] = await Promise.all([
    sendEmail(
      booking.email,
      `${service.title} — ${booking.status === "confirmed" ? "confirmed" : "request received"} (${booking.reference})`,
      `Hello ${booking.name},\n\n${statusLine}\n\nService: ${service.title}\nWhen: ${when}\nReference: ${booking.reference}\n\nManage or cancel: ${siteUrl}${manageUrl}\n\n— BDIM`,
    ),
    notifyStaff(
      `New booking ${booking.reference}: ${service.title}`,
      `${service.title}\n${when}\nStatus: ${booking.status}\n\n${booking.name} <${booking.email}> ${booking.phone}\n${booking.organization}\n\n${booking.notes || "(no notes)"}\n\nConfirm or manage it: ${siteUrl}/admin/bookings`,
      booking.email,
    ),
  ]);
  return { ok: true, reference: booking.reference, status: booking.status, manageUrl, when, emailed: emailConfigured() && (customer || staff) };
}

export async function cancelBookingByToken(token: string): Promise<{ ok: true } | Failure> {
  const store = getStore();
  const booking = await store.getBookingByToken(token);
  if (!booking) return { ok: false, message: "Booking not found." };
  if (booking.status === "cancelled") return { ok: true };
  if (new Date(booking.startsAt).getTime() < Date.now()) return { ok: false, message: "Past sessions can't be cancelled online." };
  const res = await store.updateBooking(booking.id, { status: "cancelled" });
  if (!res.ok) return { ok: false, message: res.message };
  const settings = await store.getBookingSettings();
  await notifyStaff(
    `Booking cancelled ${booking.reference}`,
    `${booking.name} cancelled the session on ${formatDateTime(booking.startsAt, settings.utcOffset)} (${settings.timeZoneLabel}).`,
    booking.email,
  );
  return { ok: true };
}

export async function getRescheduleSlots(token: string): Promise<{ ok: true; days: SlotDay[]; timeZoneLabel: string } | Failure> {
  const booking = await getStore().getBookingByToken(token);
  if (!booking || booking.status === "cancelled") return { ok: false, message: "Booking not found or cancelled." };
  const { days, settings } = await loadSlots(booking.serviceId, Date.now(), booking);
  return { ok: true, days, timeZoneLabel: settings.timeZoneLabel };
}

export async function rescheduleBookingByToken(token: string, startsAt: string): Promise<{ ok: true; when: string } | Failure> {
  const store = getStore();
  const booking = await store.getBookingByToken(token);
  if (!booking || booking.status === "cancelled") return { ok: false, message: "Booking not found or cancelled." };
  const { days, settings } = await loadSlots(booking.serviceId, Date.now(), booking);
  const slot = days.flatMap((d) => d.slots).find((s) => s.startsAt === startsAt);
  if (!slot) return { ok: false, message: "That time is no longer available." };
  const res = await store.updateBooking(booking.id, {
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    status: settings.autoConfirm ? "confirmed" : "pending",
  });
  if (!res.ok) return { ok: false, message: res.message };
  const when = `${formatDateTime(slot.startsAt, settings.utcOffset)} (${settings.timeZoneLabel})`;
  await Promise.all([
    notifyStaff(`Booking rescheduled ${booking.reference}`, `${booking.name} moved their session to ${when}.\n\n${siteUrl}/admin/bookings`, booking.email),
    sendEmail(booking.email, `Booking ${booking.reference} rescheduled`, `Your session has been moved to ${when}. Status: ${res.booking.status}.`),
  ]);
  return { ok: true, when };
}
