"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { setUserRole } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useAdminAction } from "./admin-ui";

type Role = "learner" | "instructor" | "admin";

const LABEL: Record<Role, string> = { learner: "Learner", instructor: "Instructor", admin: "Admin" };
const ARTICLE: Record<Role, string> = { learner: "a Learner", instructor: "an Instructor", admin: "an Admin" };

/** What the person will be able to do after the change (matches the access checks in the admin area). */
const EFFECT: Record<Role, string[]> = {
  admin: [
    "Full access to the admin area: users and roles, courses, library, payments, bookings, inquiries and settings.",
    "Can make other people admins or remove them.",
  ],
  instructor: [
    "Can edit courses, questions, learning paths and the library, approve enrollments and mark assignments.",
    "No access to users and roles, bookings, inquiries or payment settings.",
  ],
  learner: ["Loses access to the admin area.", "Keeps their account, courses, progress and certificates."],
};

/**
 * Role picker for one account. Choosing a role does nothing on its own: the
 * admin presses "Make {role}" and then confirms, so a slip of the mouse can't
 * change anyone's access.
 */
export function RoleControl({ user, isSelf }: { user: { id: string; email: string; name: string; role: Role }; isSelf: boolean }) {
  const { run, pending, message } = useAdminAction();
  const [choice, setChoice] = useState<Role>(user.role);
  const [confirming, setConfirming] = useState(false);
  const changed = choice !== user.role;

  useEffect(() => {
    if (!confirming) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !pending && setConfirming(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [confirming, pending]);

  const confirm = () =>
    run(
      () => setUserRole(user.id, choice),
      () => setConfirming(false),
    );

  return (
    <div className="grid gap-2">
      {message}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-muted" htmlFor={`role-${user.id}`}>
          Role
        </label>
        <Select
          id={`role-${user.id}`}
          className="h-9 w-36"
          value={choice}
          disabled={pending || isSelf}
          onChange={(e) => setChoice(e.target.value as Role)}
        >
          <option value="learner">Learner</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </Select>
        {isSelf ? (
          <span className="text-xs text-muted">You can&apos;t change your own role.</span>
        ) : (
          <Button size="sm" variant={changed ? "teal" : "outline"} disabled={!changed || pending} onClick={() => setConfirming(true)}>
            <ShieldCheck className="size-4" aria-hidden /> Make {LABEL[choice]}
          </Button>
        )}
        {changed && !isSelf ? (
          <button type="button" className="text-xs font-medium text-muted underline" onClick={() => setChoice(user.role)}>
            Undo
          </button>
        ) : null}
      </div>

      {confirming
        ? createPortal(
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !pending && setConfirming(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby={`role-title-${user.id}`} className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-lift)]">
            <div className="flex items-start justify-between gap-3">
              <h2 id={`role-title-${user.id}`} className="text-lg font-bold text-navy-950">
                Make {user.name} {ARTICLE[choice]}?
              </h2>
              <button type="button" aria-label="Cancel" disabled={pending} onClick={() => setConfirming(false)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">
              {user.email} · now {ARTICLE[user.role]}
            </p>
            <ul className="mt-4 grid gap-1.5 text-sm text-navy-900">
              {EFFECT[choice].map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden>•</span> {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-surface p-3 text-xs text-muted">
              This takes effect immediately. If they are using the website now, their menus update within a minute.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant={choice === "learner" ? "danger" : "teal"} size="sm" disabled={pending} onClick={confirm}>
                {pending ? "Saving…" : `Yes, make ${LABEL[choice]}`}
              </Button>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
