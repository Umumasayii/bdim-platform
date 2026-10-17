"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { TAGS } from "@/lib/data/content";
import { LIBRARY_TAG, PAYMENT_TAG } from "@/lib/data/library";
import { getStore } from "@/lib/data/store";
import { checkLocalAdminPassword, createLocalAdminToken, LOCAL_ADMIN_COOKIE } from "@/lib/auth/local-admin";
import { requireStaff } from "@/lib/auth/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type {
  BookableService,
  BookingSettings,
  BookingStatus,
  Course,
  InquiryStatus,
  InstructorProfile,
  LearningPath,
  LibraryItem,
  LibraryOrderStatus,
  PaymentSettings,
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

// ───────── Users (admin only, Supabase) ─────────
export async function setUserRole(userId: string, role: "learner" | "instructor" | "admin"): Promise<AdminResult> {
  let viewer;
  try {
    viewer = await requireStaff({ adminOnly: true });
  } catch {
    return { ok: false, message: "Administrator access is required." };
  }
  if (!isSupabaseConfigured) return { ok: false, message: "User management requires Supabase." };
  if (userId === viewer.id && role !== "admin") return { ok: false, message: "You can't remove your own administrator access." };
  const db = createServiceClient();
  const { error } =
    role === "learner"
      ? await db.from("staff_roles").delete().eq("user_id", userId)
      : await db.from("staff_roles").upsert({ user_id: userId, role });
  return error ? { ok: false, message: error.message } : { ok: true, message: `Role set to ${role}.` };
}

export async function enrollUser(userId: string, courseId: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  if (!isSupabaseConfigured) return { ok: false, message: "Enrollment management requires Supabase." };
  const db = createServiceClient();
  const { error } = await db
    .from("enrollments")
    .upsert({ user_id: userId, course_id: courseId, status: "active", updated_at: new Date().toISOString() }, { onConflict: "user_id,course_id" });
  return error ? { ok: false, message: error.message } : { ok: true, message: "Enrolled." };
}

/** Short-lived download link for a learner's submitted file (staff only). */
export async function getSubmissionFileUrl(path: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied.ok ? "" : denied.message };
  const { data, error } = await createServiceClient().storage.from("submissions").createSignedUrl(path, 600);
  return error || !data ? { ok: false, message: "File not found." } : { ok: true, url: data.signedUrl };
}

/** Grade a submission: score, out-of, feedback. The learner sees it and gets an email. */
export async function gradeSubmission(input: { id: string; score: number; maxScore: number; feedback: string }): Promise<AdminResult> {
  let viewer;
  try {
    viewer = await requireStaff();
  } catch {
    return { ok: false, message: "Staff access is required." };
  }
  if (!isSupabaseConfigured) return { ok: false, message: "Grading requires Supabase." };
  const score = Number(input.score);
  const maxScore = Number(input.maxScore);
  if (!Number.isFinite(maxScore) || maxScore <= 0) return { ok: false, message: "“Out of” must be a positive number." };
  if (!Number.isFinite(score) || score < 0 || score > maxScore) return { ok: false, message: `Score must be between 0 and ${maxScore}.` };
  const db = await createUserClient();
  const { data, error } = await db
    .from("assignment_submissions")
    .update({
      status: "reviewed",
      score,
      max_score: maxScore,
      feedback: input.feedback.slice(0, 4000),
      graded_at: new Date().toISOString(),
      graded_by: viewer.local ? null : viewer.id,
    })
    .eq("id", input.id)
    .select("user_id, course_id, assignment_id")
    .single();
  if (error) return { ok: false, message: error.message };

  // Let the learner know (best effort).
  try {
    const { data: u } = await createServiceClient().auth.admin.getUserById(data.user_id);
    const course = (await getStore().listCourses({ includeUnpublished: true })).find((c) => c.id === data.course_id);
    const assignment = course?.modules.find((m) => m.assignment?.id === data.assignment_id)?.assignment;
    if (u.user?.email) {
      await sendEmail(
        u.user.email,
        `Your assignment has been graded: ${assignment?.title ?? "assignment"}`,
        `Hello,\n\nYour submission for "${assignment?.title ?? "your assignment"}" in ${course?.title ?? "your course"} has been graded.\n\nScore: ${score} / ${maxScore}${input.feedback ? `\n\nFeedback:\n${input.feedback}` : ""}\n\nSee all your grades: ${siteUrl}/dashboard?tab=grades\n\n— BDIM`,
      );
    }
  } catch {
    // Grade is saved even if the email fails.
  }
  return { ok: true, message: `Graded ${score} / ${maxScore}.` };
}

// ───────── Library (staff, Supabase) ─────────
export async function saveLibraryItem(item: LibraryItem): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  if (!isSupabaseConfigured) return { ok: false, message: "The library requires Supabase." };
  const title = item.title.trim();
  if (!title) return { ok: false, message: "Give the item a title." };
  if (!item.filePath && !/^https?:\/\//.test(item.externalUrl.trim())) return { ok: false, message: "Upload a file or add a link (https://…)." };
  if (item.visibility === "enrolled" && !item.courseId) return { ok: false, message: "Choose the course whose learners can open it." };
  const price = Number(item.price) || 0;
  if (price < 0 || price > 10_000_000) return { ok: false, message: "Enter a valid price (0 for free)." };
  if (price > 0 && !item.filePath) return { ok: false, message: "Items for sale must be an uploaded file — a link could be opened without paying." };
  const row = {
    title: title.slice(0, 200),
    description: item.description.slice(0, 2000),
    kind: item.kind,
    file_path: item.filePath,
    file_name: item.fileName,
    file_size: item.fileSize,
    external_url: price > 0 ? "" : item.externalUrl.trim(),
    course_id: item.courseId || null,
    visibility: item.visibility,
    price,
    currency: (item.currency || "RWF").slice(0, 3).toUpperCase(),
    published: item.published,
    sort_order: item.sortOrder,
    updated_at: new Date().toISOString(),
  };
  const db = await createUserClient();
  const { error } = item.id ? await db.from("library_items").update(row).eq("id", item.id) : await db.from("library_items").insert(row);
  if (error) return { ok: false, message: error.message };
  updateTag(LIBRARY_TAG);
  return { ok: true, message: item.id ? "Saved." : "Added to the library." };
}

export async function deleteLibraryItem(id: string, filePath: string): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const db = await createUserClient();
  const { error } = await db.from("library_items").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  if (filePath) await db.storage.from("library").remove([filePath]);
  updateTag(LIBRARY_TAG);
  return { ok: true, message: "Deleted." };
}

// ───────── Library sales (staff) ─────────
export async function setLibraryOrderStatus(id: string, status: LibraryOrderStatus): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  const viewer = await requireStaff();
  const db = await createUserClient();
  const { data, error } = await db
    .from("library_orders")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null, confirmed_by: status === "paid" && !viewer.local ? viewer.id : null })
    .eq("id", id)
    .select("user_id, amount, currency, library_items(title)")
    .single();
  if (error) return { ok: false, message: error.message };
  if (status === "paid") {
    try {
      const { data: u } = await createServiceClient().auth.admin.getUserById(data.user_id);
      const title = (data.library_items as unknown as { title: string } | null)?.title ?? "your item";
      if (u.user?.email) {
        await sendEmail(
          u.user.email,
          `Payment confirmed: ${title}`,
          `Hello,\n\nWe have received your payment of ${Number(data.amount).toLocaleString("en-US")} ${data.currency} for "${title}". It is now unlocked.\n\nDownload it from the library: ${siteUrl}/library\n\nThank you,\nBDIM`,
        );
      }
    } catch {
      // The order is confirmed even if the email fails.
    }
  }
  return { ok: true, message: status === "paid" ? "Payment confirmed — the learner can now download it." : status === "cancelled" ? "Order cancelled." : "Order reopened." };
}

export async function savePaymentSettings(input: PaymentSettings): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const clip = (v: string, n: number) => (v ?? "").trim().slice(0, n);
  const db = await createUserClient();
  const { error } = await db
    .from("payment_settings")
    .update({
      momo_number: clip(input.momoNumber, 40),
      momo_name: clip(input.momoName, 120),
      bank_details: clip(input.bankDetails, 600),
      instructions: clip(input.instructions, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, message: error.message };
  updateTag(PAYMENT_TAG);
  return { ok: true, message: "Payment details saved." };
}
