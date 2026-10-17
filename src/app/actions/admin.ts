"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { TAGS } from "@/lib/data/content";
import { getStore } from "@/lib/data/store";
import { checkLocalAdminPassword, createLocalAdminToken, LOCAL_ADMIN_COOKIE } from "@/lib/auth/local-admin";
import { requireStaff } from "@/lib/auth/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { createUserClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type {
  BookableService,
  BookingSettings,
  BookingStatus,
  Course,
  InquiryStatus,
  InstructorProfile,
  LearningPath,
  Question,
  Testimonial,
} from "@/lib/types";
import {
  bookableServiceSchema,
  bookingSettingsSchema,
  courseSchema,
  fieldErrors,
  instructorSchema,
  pathSchema,
  questionSchema,
  testimonialSchema,
} from "@/lib/validation";

export type AdminResult = { ok: true; message?: string } | { ok: false; message: string; errors?: Record<string, string> };

async function guard(adminOnly = false): Promise<AdminResult | null> {
  try {
    await requireStaff({ adminOnly });
    return null;
  } catch {
    return { ok: false, message: adminOnly ? "Administrator access is required." : "Staff access is required." };
  }
}

async function attempt(fn: () => Promise<void>, tags: string[], message = "Saved."): Promise<AdminResult> {
  try {
    await fn();
    tags.forEach((t) => updateTag(t));
    return { ok: true, message };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

// ───────── Local admin session (development only) ─────────
export async function localAdminLogin(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  if (isSupabaseConfigured) return { ok: false, message: "Use your staff account to sign in." };
  const now = Date.now();
  if (!(await rateLimit("admin-login", 8, 15 * 60_000, now))) return { ok: false, message: "Too many attempts. Try again later." };
  if (!checkLocalAdminPassword(String(form.get("password") ?? ""))) return { ok: false, message: "Incorrect password." };
  const { token, maxAge } = createLocalAdminToken(now);
  (await cookies()).set(LOCAL_ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  redirect("/admin");
}

export async function localAdminLogout() {
  (await cookies()).delete(LOCAL_ADMIN_COOKIE);
  redirect("/admin/login");
}

// ───────── Content ─────────
export async function saveCourse(course: Course): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = courseSchema.safeParse(course);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveCourse(parsed.data as Course), [TAGS.courses]);
}

export async function deleteCourse(id: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  return attempt(() => getStore().deleteCourse(id), [TAGS.courses], "Course deleted.");
}

export async function saveQuestion(question: Question): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = questionSchema.safeParse(question);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveQuestion(parsed.data as Question), [TAGS.questions]);
}

export async function deleteQuestion(id: string): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  return attempt(() => getStore().deleteQuestion(id), [TAGS.questions], "Question deleted.");
}

export async function savePath(path: LearningPath): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const parsed = pathSchema.safeParse(path);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().savePath(parsed.data), [TAGS.paths]);
}

export async function deletePath(id: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  return attempt(() => getStore().deletePath(id), [TAGS.paths], "Learning path deleted.");
}

export async function saveInstructor(profile: InstructorProfile): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const parsed = instructorSchema.safeParse(profile);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveInstructor(parsed.data), [TAGS.instructors, TAGS.booking]);
}

export async function saveTestimonial(t: Testimonial): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const parsed = testimonialSchema.safeParse(t);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveTestimonial(parsed.data), [TAGS.testimonials]);
}

export async function deleteTestimonial(id: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  return attempt(() => getStore().deleteTestimonial(id), [TAGS.testimonials], "Testimonial deleted.");
}

// ───────── Bookings ─────────
export async function saveBookingSettings(settings: BookingSettings): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const parsed = bookingSettingsSchema.safeParse(settings);
  if (!parsed.success) return { ok: false, message: "Please fix the schedule.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveBookingSettings({ ...parsed.data, reviewed: true }), [TAGS.booking], "Schedule saved.");
}

export async function saveBookableService(service: BookableService): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const parsed = bookableServiceSchema.safeParse(service);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  return attempt(() => getStore().saveBookableService(parsed.data), [TAGS.booking]);
}

export async function updateBookingStatus(id: string, status: BookingStatus, adminNote: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const store = getStore();
  const res = await store.updateBooking(id, { status, adminNote: adminNote.slice(0, 2000) });
  if (!res.ok) return { ok: false, message: res.message };
  if (status === "confirmed" || status === "cancelled") {
    await sendEmail(
      res.booking.email,
      `Booking ${res.booking.reference} ${status}`,
      `Hello ${res.booking.name},\n\nYour BDIM session (${res.booking.reference}) is now ${status}.${adminNote ? `\n\nNote: ${adminNote}` : ""}\n\n— BDIM`,
    );
  }
  return { ok: true, message: `Booking marked ${status}.` };
}

export async function updateInquiry(id: string, status: InquiryStatus, adminNote: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  return attempt(() => getStore().updateInquiry(id, { status, adminNote: adminNote.slice(0, 4000) }), [], "Inquiry updated.");
}

// ───────── Learner management (requires Supabase) ─────────
export async function setEnrollmentStatus(enrollmentId: string, status: "active" | "cancelled" | "requested"): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!isSupabaseConfigured) return { ok: false, message: "Enrollment management requires Supabase." };
  const db = await createUserClient();
  const { error } = await db.from("enrollments").update({ status, updated_at: new Date().toISOString() }).eq("id", enrollmentId);
  return error ? { ok: false, message: error.message } : { ok: true, message: `Enrollment ${status}.` };
}

export async function reviewAssignment(submissionId: string, feedback: string): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!isSupabaseConfigured) return { ok: false, message: "Assignment review requires Supabase." };
  const db = await createUserClient();
  const { error } = await db
    .from("assignment_submissions")
    .update({ status: "reviewed", feedback: feedback.slice(0, 4000) })
    .eq("id", submissionId);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Feedback saved." };
}
