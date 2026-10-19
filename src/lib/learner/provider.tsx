"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { gradeQuizLocal } from "@/app/actions/learning";
import { blobToDataUrl, toSquareJpeg } from "@/lib/image";
import { emptyLearnerState, type EnrollmentStatus, type LearnerMode, type LearnerProfile, type LearnerState, type QuizGradeResult } from "./types";

export const SUBMISSION_MAX_BYTES = 20 * 1024 * 1024;

const STORAGE_KEY = "bdim-learner-v1";

function loadLocal(): LearnerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLearnerState();
    return { ...emptyLearnerState(), ...(JSON.parse(raw) as Partial<LearnerState>) };
  } catch {
    return emptyLearnerState();
  }
}

function saveLocal(state: LearnerState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); state still works for this visit.
  }
}

const nowIso = () => new Date().toISOString();

/** Tells the notification bell to refresh now (the database has just created a notification). */
export const NOTIFY_EVENT = "bdim:notify";
const pingNotifications = () => window.dispatchEvent(new Event(NOTIFY_EVENT));
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

async function loadMember(db: SupabaseClient, user: User): Promise<LearnerState> {
  const s = emptyLearnerState();
  const [enr, prog, notes, marks, quiz, asg, att, saved, done, port, certs, profile, role] = await Promise.all([
    db.from("enrollments").select("course_id,status,created_at").eq("user_id", user.id),
    db.from("lesson_progress").select("lesson_id,course_id,completed_at").eq("user_id", user.id),
    db.from("lesson_notes").select("lesson_id,course_id,body,updated_at").eq("user_id", user.id),
    db.from("lesson_bookmarks").select("lesson_id,course_id,created_at").eq("user_id", user.id),
    db.from("quiz_submissions").select("quiz_id,course_id,score,passed,created_at").eq("user_id", user.id),
    db.from("assignment_submissions").select("*").eq("user_id", user.id),
    db.from("practice_attempts").select("question_id,correct,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
    db.from("saved_questions").select("question_id,created_at").eq("user_id", user.id),
    db.from("question_completions").select("question_id,completed_at").eq("user_id", user.id),
    db.from("portfolio_items").select("*").eq("user_id", user.id),
    db.from("certificates").select("*").eq("user_id", user.id),
    db.from("profiles").select("full_name,headline,bio,avatar_url,preferences").eq("id", user.id).maybeSingle(),
    db.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  enr.data?.forEach((r) => (s.enrollments[r.course_id] = { status: r.status, createdAt: r.created_at }));
  prog.data?.forEach((r) => (s.lessonsCompleted[r.lesson_id] = { courseId: r.course_id, at: r.completed_at }));
  notes.data?.forEach((r) => (s.notes[r.lesson_id] = { courseId: r.course_id, body: r.body, updatedAt: r.updated_at }));
  marks.data?.forEach((r) => (s.bookmarks[r.lesson_id] = { courseId: r.course_id, at: r.created_at }));
  quiz.data?.forEach((r) => {
    const prev = s.quizResults[r.quiz_id];
    s.quizResults[r.quiz_id] = {
      courseId: r.course_id,
      best: Math.max(prev?.best ?? 0, r.score),
      passed: Boolean(prev?.passed || r.passed),
      attempts: (prev?.attempts ?? 0) + 1,
      lastAt: !prev || r.created_at > prev.lastAt ? r.created_at : prev.lastAt,
    };
  });
  s.assignments =
    asg.data?.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      assignmentId: r.assignment_id,
      body: r.body,
      link: r.link,
      status: r.status,
      feedback: r.feedback,
      at: r.created_at,
      filePath: r.file_path ?? "",
      fileName: r.file_name ?? "",
      score: r.score,
      maxScore: r.max_score,
      gradedAt: r.graded_at,
    })) ?? [];
  s.attempts = att.data?.map((r) => ({ questionId: r.question_id, correct: r.correct, at: r.created_at })) ?? [];
  saved.data?.forEach((r) => (s.saved[r.question_id] = r.created_at));
  done.data?.forEach((r) => (s.completed[r.question_id] = r.completed_at));
  s.portfolio =
    port.data?.map((r) => ({ id: r.id, title: r.title, description: r.description, url: r.url, courseId: r.course_id ?? undefined, at: r.created_at })) ?? [];
  s.certificates =
    certs.data?.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      number: r.certificate_number,
      courseTitle: r.course_title,
      learnerName: r.learner_name,
      issuedAt: r.issued_at,
      demo: false,
    })) ?? [];
  s.role = role.data?.role === "admin" || role.data?.role === "instructor" ? role.data.role : undefined;
  if (profile.data) {
    s.profile = {
      fullName: profile.data.full_name ?? "",
      headline: profile.data.headline ?? "",
      bio: profile.data.bio ?? "",
      avatarUrl: profile.data.avatar_url || undefined,
      preferences: profile.data.preferences ?? {},
    };
  }
  return s;
}

interface CertificateCourse {
  id: string;
  title: string;
  lessonIds: string[];
  quizIds: string[];
  rules: { enabled: boolean; requireAllLessons: boolean; minQuizScore: number };
}

interface LearnerContextValue {
  ready: boolean;
  mode: LearnerMode;
  user: { id: string; email: string } | null;
  state: LearnerState;
  error: string | null;
  clearError: () => void;
  signOut: () => Promise<void>;
  enroll: (courseId: string, mode: "open" | "approval") => Promise<EnrollmentStatus | null>;
  setLessonComplete: (courseId: string, lessonId: string, done: boolean) => Promise<void>;
  setLastLesson: (courseId: string, courseSlug: string, lessonId: string) => void;
  saveNote: (courseId: string, lessonId: string, body: string) => Promise<boolean>;
  toggleBookmark: (courseId: string, lessonId: string) => Promise<void>;
  submitQuiz: (courseSlug: string, courseId: string, quizId: string, answers: Record<string, number>) => Promise<QuizGradeResult | null>;
  submitAssignment: (courseId: string, assignmentId: string, body: string, link: string, file?: File | null) => Promise<boolean>;
  recordAttempt: (questionId: string, correct: boolean) => Promise<void>;
  toggleSaved: (questionId: string) => Promise<void>;
  toggleCompleted: (questionId: string) => Promise<void>;
  addPortfolioItem: (item: { title: string; description: string; url: string; courseId?: string }) => Promise<boolean>;
  removePortfolioItem: (id: string) => Promise<void>;
  updateProfile: (profile: LearnerProfile) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  removeAvatar: () => Promise<boolean>;
  certificateStatus: (course: CertificateCourse) => { eligible: boolean; missingLessons: number; failingQuizzes: number };
  issueCertificate: (course: CertificateCourse) => Promise<boolean>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

export function LearnerProvider({ children }: { children: ReactNode }) {
  const db = getBrowserSupabase();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<LearnerState>(emptyLearnerState);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const mode: LearnerMode = !db ? "demo" : user ? "member" : "guest";

  // Initial load + auth subscription
  useEffect(() => {
    let cancelled = false;
    async function init(u: User | null) {
      if (db && u) {
        try {
          const s = await loadMember(db, u);
          if (!cancelled) setState({ ...s, lastLesson: loadLocal().lastLesson });
        } catch {
          if (!cancelled) setError("Could not load your learning data. Please refresh.");
        }
      } else if (!cancelled) {
        setState(loadLocal());
      }
      if (!cancelled) setReady(true);
    }
    if (!db) {
      void init(null);
      return () => {
        cancelled = true;
      };
    }
    db.auth.getUser().then(({ data }) => {
      setUser(data.user);
      void init(data.user);
    });
    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser((prev) => {
        if (prev?.id !== next?.id) void init(next);
        return next;
      });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [db]);

  // Keep the role current: an admin may promote or demote this person while
  // they are signed in. Re-check every minute and when the tab regains focus,
  // then refresh server-rendered pages (the admin area re-checks access itself).
  const userId = user?.id;
  useEffect(() => {
    if (!db || !userId || !ready) return;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const { data, error: err } = await db.from("staff_roles").select("role").eq("user_id", userId).maybeSingle();
      if (stopped || err) return;
      const role = data?.role === "admin" || data?.role === "instructor" ? data.role : undefined;
      if (role !== stateRef.current.role) {
        setState((s) => ({ ...s, role }));
        router.refresh();
      }
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [db, userId, ready, router]);

  // Persist browser-held state
  useEffect(() => {
    if (!ready) return;
    if (mode === "member") saveLocal({ ...emptyLearnerState(), lastLesson: state.lastLesson });
    else saveLocal(state);
  }, [state, ready, mode]);

  const update = useCallback((fn: (s: LearnerState) => LearnerState) => setState((s) => fn(structuredClone(s))), []);

  const run = useCallback(async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: err } = await op;
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  const requireMember = useCallback(() => {
    if (mode === "guest") {
      setError("Please sign in to save course progress.");
      return false;
    }
    return true;
  }, [mode]);

  const value = useMemo<LearnerContextValue>(() => {
    const member = mode === "member" && db && user;
    const certificateStatus = (course: CertificateCourse) => {
      const s = state;
      const missingLessons = course.rules.requireAllLessons ? course.lessonIds.filter((id) => !s.lessonsCompleted[id]).length : 0;
      const failingQuizzes = course.quizIds.filter((id) => (s.quizResults[id]?.best ?? -1) < course.rules.minQuizScore).length;
      const enrolled = ["active", "completed"].includes(s.enrollments[course.id]?.status ?? "");
      return { eligible: course.rules.enabled && enrolled && missingLessons === 0 && failingQuizzes === 0, missingLessons, failingQuizzes };
    };
    return {
      ready,
      mode,
      user: user ? { id: user.id, email: user.email ?? "" } : null,
      state,
      error,
      clearError: () => setError(null),
      async signOut() {
        if (db) await db.auth.signOut();
        router.push("/");
        router.refresh();
      },

      async enroll(courseId, enrollmentMode) {
        if (!requireMember()) return null;
        const status: EnrollmentStatus = enrollmentMode === "open" ? "active" : "requested";
        if (member && !(await run(db.from("enrollments").insert({ user_id: user.id, course_id: courseId, status })))) return null;
        if (member) pingNotifications();
        update((s) => ((s.enrollments[courseId] = { status, createdAt: nowIso() }), s));
        return status;
      },

      async setLessonComplete(courseId, lessonId, done) {
        if (!requireMember()) return;
        if (member) {
          const ok = done
            ? await run(db.from("lesson_progress").upsert({ user_id: user.id, lesson_id: lessonId, course_id: courseId }))
            : await run(db.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId));
          if (!ok) return;
        }
        update((s) => {
          if (done) s.lessonsCompleted[lessonId] = { courseId, at: nowIso() };
          else delete s.lessonsCompleted[lessonId];
          return s;
        });
      },

      setLastLesson(courseId, courseSlug, lessonId) {
        update((s) => ((s.lastLesson = { courseId, courseSlug, lessonId, at: nowIso() }), s));
      },

      async saveNote(courseId, lessonId, body) {
        if (!requireMember()) return false;
        if (member && !(await run(db.from("lesson_notes").upsert({ user_id: user.id, lesson_id: lessonId, course_id: courseId, body, updated_at: nowIso() }))))
          return false;
        update((s) => ((s.notes[lessonId] = { courseId, body, updatedAt: nowIso() }), s));
        return true;
      },

      async toggleBookmark(courseId, lessonId) {
        if (!requireMember()) return;
        const has = Boolean(stateRef.current.bookmarks[lessonId]);
        if (member) {
          const ok = has
            ? await run(db.from("lesson_bookmarks").delete().eq("user_id", user.id).eq("lesson_id", lessonId))
            : await run(db.from("lesson_bookmarks").insert({ user_id: user.id, lesson_id: lessonId, course_id: courseId }));
          if (!ok) return;
        }
        update((s) => {
          if (has) delete s.bookmarks[lessonId];
          else s.bookmarks[lessonId] = { courseId, at: nowIso() };
          return s;
        });
      },

      async submitQuiz(courseSlug, courseId, quizId, answers) {
        if (!requireMember()) return null;
        let result: QuizGradeResult | null = null;
        if (member) {
          const { data, error: err } = await db.rpc("submit_quiz", { p_quiz_id: quizId, p_answers: answers });
          if (err) {
            setError(err.message.includes("not_enrolled") ? "Your enrollment must be active to submit quizzes." : err.message);
            return null;
          }
          result = data as QuizGradeResult;
          pingNotifications();
        } else {
          const graded = await gradeQuizLocal(courseSlug, quizId, answers);
          if (!graded.ok) {
            setError(graded.message);
            return null;
          }
          result = graded.result;
        }
        const r = result;
        update((s) => {
          const prev = s.quizResults[quizId];
          s.quizResults[quizId] = {
            courseId,
            best: Math.max(prev?.best ?? 0, r.score),
            passed: Boolean(prev?.passed || r.passed),
            attempts: (prev?.attempts ?? 0) + 1,
            lastAt: nowIso(),
          };
          return s;
        });
        return r;
      },

      async submitAssignment(courseId, assignmentId, body, link, file) {
        if (!requireMember()) return false;
        let id = uid();
        let filePath = "";
        const fileName = file?.name ?? "";
        if (file && !member) {
          setError("File uploads need a signed-in account. Paste a link instead.");
          return false;
        }
        if (file && file.size > SUBMISSION_MAX_BYTES) {
          setError("The file is larger than 20 MB. Share a link to it instead.");
          return false;
        }
        if (member) {
          if (file) {
            const safe = file.name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").slice(-100);
            filePath = `${user.id}/${courseId}/${assignmentId}/${Date.now()}-${safe}`;
            const { error: upErr } = await db.storage.from("submissions").upload(filePath, file, { contentType: file.type || undefined });
            if (upErr) {
              setError(upErr.message.includes("row-level security") ? "Submissions for this assignment are closed (the deadline has passed)." : `Upload failed: ${upErr.message}`);
              return false;
            }
          }
          const { data, error: err } = await db
            .from("assignment_submissions")
            .insert({ user_id: user.id, course_id: courseId, assignment_id: assignmentId, body, link, file_path: filePath, file_name: fileName })
            .select("id")
            .single();
          if (err) {
            setError(err.message.includes("row-level security") ? "Submissions for this assignment are closed (the deadline has passed)." : err.message);
            return false;
          }
          id = data.id;
          pingNotifications();
        }
        update((s) => {
          s.assignments.push({ id, courseId, assignmentId, body, link, status: "submitted", feedback: "", at: nowIso(), filePath, fileName });
          return s;
        });
        return true;
      },

      async recordAttempt(questionId, correct) {
        if (member && !(await run(db.from("practice_attempts").insert({ user_id: user.id, question_id: questionId, correct })))) return;
        update((s) => {
          s.attempts.unshift({ questionId, correct, at: nowIso() });
          s.attempts = s.attempts.slice(0, 500);
          return s;
        });
      },

      async toggleSaved(questionId) {
        const has = Boolean(stateRef.current.saved[questionId]);
        if (member) {
          const ok = has
            ? await run(db.from("saved_questions").delete().eq("user_id", user.id).eq("question_id", questionId))
            : await run(db.from("saved_questions").insert({ user_id: user.id, question_id: questionId }));
          if (!ok) return;
        }
        update((s) => {
          if (has) delete s.saved[questionId];
          else s.saved[questionId] = nowIso();
          return s;
        });
      },

      async toggleCompleted(questionId) {
        const has = Boolean(stateRef.current.completed[questionId]);
        if (member) {
          const ok = has
            ? await run(db.from("question_completions").delete().eq("user_id", user.id).eq("question_id", questionId))
            : await run(db.from("question_completions").insert({ user_id: user.id, question_id: questionId }));
          if (!ok) return;
        }
        update((s) => {
          if (has) delete s.completed[questionId];
          else s.completed[questionId] = nowIso();
          return s;
        });
      },

      async addPortfolioItem(item) {
        if (!requireMember()) return false;
        let id = uid();
        if (member) {
          const { data, error: err } = await db
            .from("portfolio_items")
            .insert({ user_id: user.id, title: item.title, description: item.description, url: item.url, course_id: item.courseId ?? null })
            .select("id")
            .single();
          if (err) {
            setError(err.message);
            return false;
          }
          id = data.id;
        }
        update((s) => (s.portfolio.unshift({ ...item, id, at: nowIso() }), s));
        return true;
      },

      async removePortfolioItem(id) {
        if (member && !(await run(db.from("portfolio_items").delete().eq("id", id)))) return;
        update((s) => ((s.portfolio = s.portfolio.filter((p) => p.id !== id)), s));
      },

      async updateProfile(profile) {
        if (!requireMember()) return false;
        if (
          member &&
          !(await run(
            db
              .from("profiles")
              .update({ full_name: profile.fullName, headline: profile.headline, bio: profile.bio, preferences: profile.preferences, updated_at: nowIso() })
              .eq("id", user.id),
          ))
        )
          return false;
        update((s) => ((s.profile = { ...profile, avatarUrl: s.profile.avatarUrl }), s));
        return true;
      },

      certificateStatus,

      async uploadAvatar(file) {
        if (!requireMember()) return false;
        let blob: Blob;
        try {
          blob = await toSquareJpeg(file);
        } catch (err) {
          setError((err as Error).message);
          return false;
        }
        let url: string;
        if (member) {
          const path = `${user.id}/avatar.jpg`;
          const { error: upErr } = await db.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
          if (upErr) {
            setError(`Upload failed: ${upErr.message}`);
            return false;
          }
          // Version query so browsers and the CDN show the new picture straight away.
          url = `${db.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
          if (!(await run(db.from("profiles").update({ avatar_url: url, updated_at: nowIso() }).eq("id", user.id)))) return false;
        } else {
          url = await blobToDataUrl(blob); // demo mode: kept in this browser only
        }
        update((s) => ((s.profile = { ...s.profile, avatarUrl: url }), s));
        return true;
      },

      async removeAvatar() {
        if (!requireMember()) return false;
        if (member) {
          await db.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
          if (!(await run(db.from("profiles").update({ avatar_url: "", updated_at: nowIso() }).eq("id", user.id)))) return false;
        }
        update((s) => ((s.profile = { ...s.profile, avatarUrl: undefined }), s));
        return true;
      },

      async issueCertificate(course) {
        if (!requireMember()) return false;
        if (member) {
          const { data, error: err } = await db.rpc("issue_certificate", { p_course_id: course.id });
          if (err) {
            setError(err.message.includes("requirements_not_met") ? "Completion requirements are not met yet." : err.message);
            return false;
          }
          pingNotifications();
          const c = data as { id: string; course_id: string; certificate_number: string; course_title: string; learner_name: string; issued_at: string };
          update((s) => {
            s.certificates = s.certificates.filter((x) => x.courseId !== course.id);
            s.certificates.push({ id: c.id, courseId: c.course_id, number: c.certificate_number, courseTitle: c.course_title, learnerName: c.learner_name, issuedAt: c.issued_at, demo: false });
            s.enrollments[course.id] = { ...(s.enrollments[course.id] ?? { createdAt: nowIso() }), status: "completed" };
            return s;
          });
          return true;
        }
        // Demo mode: requirements are checked against this browser's records and
        // the certificate is clearly marked as a demonstration.
        if (!certificateStatus(course).eligible) {
          setError("Completion requirements are not met yet.");
          return false;
        }
        update((s) => {
          if (!s.certificates.some((x) => x.courseId === course.id)) {
            s.certificates.push({
              id: uid(),
              courseId: course.id,
              number: `DEMO-${uid().slice(0, 8).toUpperCase()}`,
              courseTitle: course.title,
              learnerName: s.profile.fullName || "Demo learner",
              issuedAt: nowIso(),
              demo: true,
            });
          }
          s.enrollments[course.id] = { ...(s.enrollments[course.id] ?? { createdAt: nowIso() }), status: "completed" };
          return s;
        });
        return true;
      },
    };
  }, [ready, mode, db, user, state, error, update, run, requireMember, router]);

  return <LearnerContext value={value}>{children}</LearnerContext>;
}

export function useLearner() {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearner must be used inside <LearnerProvider>");
  return ctx;
}
