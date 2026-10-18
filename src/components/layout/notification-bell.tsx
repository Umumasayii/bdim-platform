"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Bell,
  BookOpenCheck,
  CheckCheck,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  FileUp,
  GraduationCap,
  Inbox,
  Library,
  ShoppingBag,
  X,
  type LucideIcon,
} from "lucide-react";
import { deleteNotification, getNotifications, markNotificationsRead, type NotificationItem } from "@/app/actions/notifications";
import { NOTIFY_EVENT, useLearner } from "@/lib/learner/provider";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

const icons: Record<string, LucideIcon> = {
  enrollment_active: GraduationCap,
  enrollment_requested: GraduationCap,
  enrollment_cancelled: CircleX,
  assignment_submitted: FileUp,
  assignment_graded: ClipboardCheck,
  quiz_passed: CircleCheck,
  quiz_failed: BookOpenCheck,
  course_completed: Award,
  library_new: Library,
  order_placed: ShoppingBag,
  order_paid: ShoppingBag,
  staff_submission: FileUp,
  staff_enrollment_request: GraduationCap,
  staff_order: ShoppingBag,
};

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Bell with unread count and a panel of the signed-in person's notifications. */
export function NotificationBell() {
  const { mode } = useLearner();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const [failed, setFailed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const member = mode === "member";

  const refresh = useCallback(async () => {
    const res = await getNotifications().catch(() => null);
    setFailed(!res?.ok);
    if (!res?.ok) return;
    setItems(res.items);
    setUnread(res.unread);
    setNow(Date.now());
  }, []);

  // Load now, when the tab regains focus, every minute while visible, and right after learner activity.
  useEffect(() => {
    if (!member) return;
    const visible = () => document.visibilityState === "visible";
    const onFocus = () => visible() && void refresh();
    const timer = window.setInterval(onFocus, POLL_MS);
    const soon = () => window.setTimeout(() => void refresh(), 300);
    const first = window.setTimeout(() => void refresh(), 0);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(NOTIFY_EVENT, soon);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(NOTIFY_EVENT, soon);
    };
  }, [member, refresh]);

  // Close on outside click or Escape (the panel lives in a portal, so check both elements).
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!member) return null;

  const markRead = (ids?: string[]) => {
    const stamp = new Date().toISOString();
    setItems((list) => list?.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: stamp } : n)) ?? list);
    setUnread((u) => (ids ? Math.max(0, u - (items?.filter((n) => !n.readAt && ids.includes(n.id)).length ?? 0)) : 0));
    void markNotificationsRead(ids);
  };

  const remove = (n: NotificationItem) => {
    setItems((list) => list?.filter((x) => x.id !== n.id) ?? list);
    if (!n.readAt) setUnread((u) => Math.max(0, u - 1));
    void deleteNotification(n.id);
  };

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) void refresh();
  };

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="notifications-panel"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-line text-navy-900 transition-colors hover:bg-surface"
      >
        <Bell className="size-4" aria-hidden />
        {unread ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#081427]">
            {badge}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            // Portal: the header's backdrop-filter would otherwise trap this fixed panel inside it.
            <div
              ref={panel}
              id="notifications-panel"
              role="dialog"
              aria-label="Notifications"
              className="fixed right-2 top-[4.25rem] z-50 flex max-h-[min(34rem,calc(100dvh-5.5rem))] w-[min(26rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-lift)] sm:right-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <p className="font-semibold text-navy-900">
                  Notifications{unread ? <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{unread} new</span> : null}
                </p>
                <div className="flex items-center gap-1">
                  {unread ? (
                    <button type="button" onClick={() => markRead()} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-surface">
                      <CheckCheck className="size-4" aria-hidden /> Mark all read
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto overscroll-contain">
                {items === null ? (
                  <p className="px-4 py-10 text-center text-sm text-muted">{failed ? "Notifications couldn't be loaded. Please try again later." : "Loading…"}</p>
                ) : items.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Inbox className="mx-auto size-8 text-muted" aria-hidden />
                    <p className="mt-3 font-semibold text-navy-900">You&apos;re all caught up</p>
                    <p className="mt-1 text-sm text-muted">Marks, certificates, new library documents and other updates will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {items.map((n) => {
                      const Icon = icons[n.kind] ?? Bell;
                      const content = (
                        <>
                          <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", n.readAt ? "bg-surface text-muted" : "bg-teal-50 text-teal-700")}>
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-sm text-navy-900", !n.readAt && "font-semibold")}>{n.title}</span>
                            {n.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.body}</span> : null}
                            <span className="mt-1 block text-xs text-muted">{timeAgo(n.createdAt, now)}</span>
                          </span>
                          {!n.readAt ? <span className="mt-2 size-2 shrink-0 rounded-full bg-teal-600" aria-label="Unread" /> : null}
                        </>
                      );
                      const rowClass = "flex flex-1 items-start gap-3 py-3 pl-4 pr-2 text-left";
                      return (
                        <li key={n.id} className={cn("group flex items-start hover:bg-surface", !n.readAt && "bg-teal-50/50")}>
                          {n.link ? (
                            <Link
                              href={n.link}
                              className={rowClass}
                              onClick={() => {
                                if (!n.readAt) markRead([n.id]);
                                setOpen(false);
                              }}
                            >
                              {content}
                            </Link>
                          ) : (
                            <button type="button" className={rowClass} onClick={() => !n.readAt && markRead([n.id])}>
                              {content}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(n)}
                            aria-label={`Remove notification: ${n.title}`}
                            className="mr-2 mt-3 grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-60 hover:bg-white hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
