import type { ProfileDetails } from "@/lib/profile-options";

export type EnrollmentStatus = "requested" | "active" | "completed" | "cancelled";

export interface LearnerProfile {
  fullName: string;
  headline: string;
  bio: string;
  /** Public URL of the profile picture (Supabase Storage), or a data URL in demo mode. */
  avatarUrl?: string;
  /** Collected at sign-up (optional for older accounts). */
  details?: ProfileDetails;
  preferences: { weeklyGoalMinutes?: number; emailUpdates?: boolean; preferredLanguage?: string; /** Activity + reminder emails; on unless set to false. */ emailNotifications?: boolean };
}

export interface LearnerState {
  enrollments: Record<string, { status: EnrollmentStatus; createdAt: string }>;
  lessonsCompleted: Record<string, { courseId: string; at: string }>;
  notes: Record<string, { courseId: string; body: string; updatedAt: string }>;
  bookmarks: Record<string, { courseId: string; at: string }>;
  quizResults: Record<string, { courseId: string; best: number; passed: boolean; attempts: number; lastAt: string }>;
  assignments: {
    id: string;
    courseId: string;
    assignmentId: string;
    body: string;
    link: string;
    status: "submitted" | "reviewed";
    feedback: string;
    at: string;
    /** Uploaded file in the private `submissions` bucket. */
    filePath?: string;
    fileName?: string;
    score?: number | null;
    maxScore?: number | null;
    gradedAt?: string | null;
  }[];
  attempts: { questionId: string; correct: boolean; at: string }[];
  saved: Record<string, string>;
  completed: Record<string, string>;
  portfolio: { id: string; title: string; description: string; url: string; courseId?: string; at: string }[];
  certificates: {
    id: string;
    courseId: string;
    number: string;
    courseTitle: string;
    learnerName: string;
    issuedAt: string;
    demo: boolean;
  }[];
  profile: LearnerProfile;
  /** Staff role of the signed-in account (shows admin shortcuts; the server re-checks every action). */
  role?: "admin" | "instructor";
  lastLesson?: { courseId: string; courseSlug: string; lessonId: string; at: string };
}

export const emptyLearnerState = (): LearnerState => ({
  enrollments: {},
  lessonsCompleted: {},
  notes: {},
  bookmarks: {},
  quizResults: {},
  assignments: [],
  attempts: [],
  saved: {},
  completed: {},
  portfolio: [],
  certificates: [],
  profile: { fullName: "", headline: "", bio: "", preferences: {} },
});

/**
 * demo   — no Supabase configured: everything is stored in this browser.
 * guest  — Supabase configured but signed out: practice tracking only, in this browser.
 * member — signed in with Supabase: stored in the database under RLS.
 */
export type LearnerMode = "demo" | "guest" | "member";

export interface QuizGradeResult {
  score: number;
  passed: boolean;
  passMark: number;
  results: { id: string; correct: boolean; answerIndex: number; explanation: string }[];
}

/** Consecutive days (ending today or yesterday) with any learning activity. */
export function computeStreak(state: LearnerState, now = new Date()): number {
  const days = new Set<string>();
  const add = (iso?: string) => iso && days.add(iso.slice(0, 10));
  Object.values(state.lessonsCompleted).forEach((x) => add(x.at));
  state.attempts.forEach((x) => add(x.at));
  Object.values(state.quizResults).forEach((x) => add(x.lastAt));
  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
