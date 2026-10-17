"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { useLearner } from "@/lib/learner/provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

interface Comment {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
}

export function Discussion({ questionId }: { questionId: string }) {
  const { mode, user, state } = useLearner();
  const db = getBrowserSupabase();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!db) return;
    const { data, error: err } = await db
      .from("question_comments")
      .select("id,user_id,display_name,body,created_at")
      .eq("question_id", questionId)
      .order("created_at");
    if (err) setError(err.message);
    else setComments(data as Comment[]);
  }, [db, questionId]);

  useEffect(() => {
    // Fetch on mount; the setState happens after the network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <section aria-labelledby="discussion-heading" className="rounded-2xl border border-line bg-white p-6">
      <h2 id="discussion-heading" className="flex items-center gap-2 text-lg font-bold text-navy-950">
        <MessageSquare className="size-5 text-teal-600" aria-hidden /> Discussion
      </h2>
      {mode === "demo" ? (
        <p className="mt-3 text-sm text-muted">Discussions open once learner accounts are enabled on this site.</p>
      ) : (
        <>
          {error ? <Notice tone="error" className="mt-3">{error}</Notice> : null}
          {comments === null ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-surface-2" />
          ) : comments.length ? (
            <ul className="mt-4 grid gap-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-surface p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="font-semibold text-navy-900">{c.display_name}</span>
                    <span className="flex items-center gap-2">
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                      {user?.id === c.user_id ? (
                        <button
                          type="button"
                          aria-label="Delete comment"
                          className="text-muted hover:text-red-600"
                          onClick={async () => {
                            await db?.from("question_comments").delete().eq("id", c.id);
                            void load();
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-navy-900">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No comments yet. Share how you approached the question.</p>
          )}

          {mode === "member" && user ? (
            <form
              className="mt-5 grid gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!db || !body.trim()) return;
                setBusy(true);
                const { error: err } = await db.from("question_comments").insert({
                  question_id: questionId,
                  user_id: user.id,
                  display_name: state.profile.fullName || user.email.split("@")[0],
                  body: body.trim(),
                });
                setBusy(false);
                if (err) setError(err.message);
                else {
                  setBody("");
                  void load();
                }
              }}
            >
              <label htmlFor="comment" className="text-sm font-medium">
                Add your perspective
              </label>
              <Textarea id="comment" rows={3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
              <div>
                <Button type="submit" variant="teal" size="sm" disabled={busy || !body.trim()}>
                  Post comment
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm">
              <Link href="/sign-in" className="font-semibold text-teal-700 hover:underline">
                Sign in
              </Link>{" "}
              to join the discussion.
            </p>
          )}
        </>
      )}
    </section>
  );
}
