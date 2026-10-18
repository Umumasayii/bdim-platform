"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Trash2 } from "lucide-react";
import { messageUser, removeUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAdminAction } from "./admin-ui";

/** "Send email" composer and "Remove member" for one account (admins only). */
export function MemberActions({
  user,
  canRemove,
  afterRemove,
}: {
  user: { id: string; email: string; name: string };
  canRemove: boolean;
  /** Where to go once the member is removed (default: stay and refresh). */
  afterRemove?: string;
}) {
  const router = useRouter();
  const { run, pending, message, clear } = useAdminAction();
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Dear {name},\n\n\n\nBest regards,\nBig Data IQ Minds");
  const [notify, setNotify] = useState(true);

  const send = () =>
    run(
      () => messageUser({ userId: user.id, subject, body, notify }),
      () => {
        setComposing(false);
        setSubject("");
        setBody("Dear {name},\n\n\n\nBest regards,\nBig Data IQ Minds");
      },
    );

  const remove = () => {
    const ok = window.confirm(
      `Remove ${user.name} (${user.email}) permanently?\n\nTheir account, enrollments, progress, submissions, certificates and orders will be deleted. This cannot be undone.`,
    );
    if (!ok) return;
    run(() => removeUser(user.id), () => afterRemove && router.push(afterRemove));
  };

  return (
    <div className="grid gap-3">
      {message}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={composing ? "secondary" : "outline"}
          onClick={() => {
            clear();
            setComposing((v) => !v);
          }}
          aria-expanded={composing}
        >
          <Mail className="size-4" aria-hidden /> {composing ? "Close email" : "Send email"}
        </Button>
        {canRemove ? (
          <Button size="sm" variant="outline" className="text-red-700 hover:border-red-300 hover:bg-red-50" disabled={pending} onClick={remove}>
            <Trash2 className="size-4" aria-hidden /> Remove member
          </Button>
        ) : null}
      </div>

      {composing ? (
        <form
          className="grid gap-3 rounded-xl border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <p className="text-sm text-muted">
            To <span className="font-semibold text-navy-900">{user.email}</span>. Write <code className="rounded bg-white px-1">{"{name}"}</code> to insert their first name. Replies come to your email.
          </p>
          <Field label="Subject" htmlFor={`msg-subject-${user.id}`}>
            <Input id={`msg-subject-${user.id}`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
          </Field>
          <Field label="Message" htmlFor={`msg-body-${user.id}`}>
            <Textarea id={`msg-body-${user.id}`} rows={9} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-teal-600" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Also show it in their notifications on the website
          </label>
          <div>
            <Button type="submit" variant="teal" size="sm" disabled={pending || !subject.trim() || !body.trim()}>
              {pending ? "Sending…" : "Send email"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
