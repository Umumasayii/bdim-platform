"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { TAGS } from "@/lib/data/content";
import { LIBRARY_TAG, PAYMENT_TAG } from "@/lib/data/library";
import { getStore } from "@/lib/data/store";
import { checkLocalAdminPassword, createLocalAdminToken, LOCAL_ADMIN_COOKIE } from "@/lib/auth/local-admin";
import { requireStaff } from "@/lib/auth/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { emailConfigured, sendEmail } from "@/lib/email";
import { dispatchNotificationEmails } from "@/lib/notifications";
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

/** Notification rows are written by database triggers; email them once the response is sent. */
const emailNotificationsSoon = () => after(() => dispatchNotificationEmails().catch(() => 0));

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

export interface CourseImpact {
  enrolled: number;
  pending: number;
  lessonsCompleted: number;
  quizAttempts: number;
  submissions: number;
  certificates: number;
}

const noImpact: CourseImpact = { enrolled: 0, pending: 0, lessonsCompleted: 0, quizAttempts: 0, submissions: 0, certificates: 0 };
const hasLearnerData = (i: CourseImpact) => Object.values(i).some((n) => n > 0);

/** What deleting a course would remove (learners' records). */
export async function getCourseImpact(id: string): Promise<{ ok: true; impact: CourseImpact } | { ok: false; message: string }> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied.ok ? "" : denied.message };
  if (!isSupabaseConfigured) return { ok: true, impact: noImpact };
  const db = await createUserClient();
  const count = async (table: string, extra?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    let q = base(table);
    if (extra) q = extra(q);
    const { count: n, error } = await q;
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  function base(table: string) {
    return db.from(table).select("*", { count: "exact", head: true }).eq("course_id", id);
  }
  try {
    const [enrolled, pending, lessonsCompleted, quizAttempts, submissions, certificates] = await Promise.all([
      count("enrollments", (q) => q.in("status", ["active", "completed"])),
      count("enrollments", (q) => q.eq("status", "requested")),
      count("lesson_progress"),
      count("quiz_submissions"),
      count("assignment_submissions"),
      count("certificates"),
    ]);
    return { ok: true, impact: { enrolled, pending, lessonsCompleted, quizAttempts, submissions, certificates } };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/**
 * Delete a course permanently (admins only). If learners have records in it,
 * the exact course title must be typed as confirmation.
 */
export async function deleteCourse(id: string, confirmTitle = ""): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  const course = (await getStore().listCourses({ includeUnpublished: true })).find((c) => c.id === id);
  if (!course) return { ok: false, message: "Course not found." };
  const impact = await getCourseImpact(id);
  if (!impact.ok) return { ok: false, message: impact.message };
  if (hasLearnerData(impact.impact) && confirmTitle.trim() !== course.title.trim()) {
    return { ok: false, message: "Type the course title exactly to confirm deleting a course that has learners." };
  }
  return attempt(() => getStore().deleteCourse(id), [TAGS.courses, LIBRARY_TAG], `"${course.title}" deleted.`);
}

/** Show or hide a course on the website. */
export async function setCoursePublished(id: string, published: boolean): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  return attempt(() => getStore().updateCourseSettings(id, { published }), [TAGS.courses], published ? "Published: visible on the website." : "Hidden from the website.");
}

/** Show or hide a course in the homepage's "Featured courses" (first 6 in course order). */
export async function setCourseFeatured(id: string, featured: boolean): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  return attempt(() => getStore().updateCourseSettings(id, { featured }), [TAGS.courses], featured ? "Added to the homepage." : "Removed from the homepage.");
}

/** Move a course one place up (-1) or down (+1) in the catalogue order. */
export async function moveCourse(id: string, direction: -1 | 1): Promise<AdminResult> {
  const denied = await guard();
  if (denied) return denied;
  return attempt(
    async () => {
      const store = getStore();
      const list = await store.listCourses({ includeUnpublished: true });
      const i = list.findIndex((c) => c.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      // Renumber 10, 20, 30… and save only the courses whose position changed.
      for (const [index, c] of list.entries()) {
        const sortOrder = (index + 1) * 10;
        if (c.sortOrder !== sortOrder) await store.updateCourseSettings(c.id, { sortOrder });
      }
    },
    [TAGS.courses],
    "Order updated.",
  );
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
  if (error) return { ok: false, message: error.message };
  emailNotificationsSoon();
  return { ok: true, message: `Enrollment ${status}.` };
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
  if (error) return { ok: false, message: error.message };
  emailNotificationsSoon();
  return { ok: true, message: "Feedback saved." };
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
  if (error) return { ok: false, message: error.message };
  const { data: target } = await db.auth.admin.getUserById(userId);
  const who = target.user?.email ?? "This person";
  const label = role === "admin" ? "an Admin" : role === "instructor" ? "an Instructor" : "a Learner";
  return { ok: true, message: `Done: ${who} is now ${label}.` };
}

export async function enrollUser(userId: string, courseId: string): Promise<AdminResult> {
  const denied = await guard(true);
  if (denied) return denied;
  if (!isSupabaseConfigured) return { ok: false, message: "Enrollment management requires Supabase." };
  const db = createServiceClient();
  const { error } = await db
    .from("enrollments")
    .upsert({ user_id: userId, course_id: courseId, status: "active", updated_at: new Date().toISOString() }, { onConflict: "user_id,course_id" });
  if (error) return { ok: false, message: error.message };
  emailNotificationsSoon();
  return { ok: true, message: "Enrolled." };
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
  const { error } = await db
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
    .select("id")
    .single(); // errors if the row wasn't updated
  if (error) return { ok: false, message: error.message };

  emailNotificationsSoon(); // the learner gets an in-site notification and an email
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
  emailNotificationsSoon(); // publishing notifies learners who can open it
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
  const { error } = await db
    .from("library_orders")
    .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null, confirmed_by: status === "paid" && !viewer.local ? viewer.id : null })
    .eq("id", id)
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  emailNotificationsSoon();
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

// ───────── Messaging and removing members (admin only, Supabase) ─────────
async function adminViewer() {
  try {
    return await requireStaff({ adminOnly: true });
  } catch {
    return null;
  }
}

/**
 * Send one member an email written by the admin. "{name}" in the subject or
 * message becomes their first name. Optionally also shows it in their bell.
 */
export async function messageUser(input: { userId: string; subject: string; body: string; notify: boolean }): Promise<AdminResult> {
  const viewer = await adminViewer();
  if (!viewer) return { ok: false, message: "Administrator access is required." };
  if (!isSupabaseConfigured) return { ok: false, message: "Messaging requires Supabase." };
  const subject = input.subject.trim().slice(0, 200);
  const body = input.body.trim().slice(0, 10_000);
  if (!subject) return { ok: false, message: "Add a subject." };
  if (!body) return { ok: false, message: "Write a message." };
  if (!emailConfigured()) return { ok: false, message: "Email isn't configured on the server (SMTP settings)." };

  const db = createServiceClient();
  const [{ data: auth }, { data: profile }] = await Promise.all([
    db.auth.admin.getUserById(input.userId),
    db.from("profiles").select("full_name").eq("id", input.userId).maybeSingle(),
  ]);
  const email = auth.user?.email;
  if (!email) return { ok: false, message: "This member has no email address." };
  const firstName = ((profile?.full_name as string) || "").trim().split(/\s+/)[0] || email.split("@")[0];
  const fill = (s: string) => s.replaceAll("{name}", firstName);

  const sent = await sendEmail(email, fill(subject), fill(body), viewer.email || undefined);
  if (!sent) return { ok: false, message: "The email could not be sent. Check the SMTP settings and try again." };
  if (input.notify) {
    await db.from("notifications").insert({ user_id: input.userId, kind: "message", title: fill(subject), body: fill(body).slice(0, 2000), link: "", email: false });
  }
  return { ok: true, message: `Email sent to ${email}.` };
}

/** Permanently delete a member's account and everything linked to it. Admins must be demoted first. */
export async function removeUser(userId: string): Promise<AdminResult> {
  const viewer = await adminViewer();
  if (!viewer) return { ok: false, message: "Administrator access is required." };
  if (!isSupabaseConfigured) return { ok: false, message: "User management requires Supabase." };
  if (userId === viewer.id) return { ok: false, message: "You can't remove your own account." };
  const db = createServiceClient();
  const { data: role } = await db.from("staff_roles").select("role").eq("user_id", userId).maybeSingle();
  if (role?.role === "admin") return { ok: false, message: "Change this person's role to Learner before removing them." };

  // Their uploaded files (database rows are removed by ON DELETE CASCADE).
  const { data: files } = await db.from("assignment_submissions").select("file_path").eq("user_id", userId).neq("file_path", "");
  const paths = (files ?? []).map((f) => f.file_path as string);
  if (paths.length) await db.storage.from("submissions").remove(paths);
  await db.storage.from("avatars").remove([`${userId}/avatar.jpg`]);

  const { error } = await db.auth.admin.deleteUser(userId);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Member removed." };
}
