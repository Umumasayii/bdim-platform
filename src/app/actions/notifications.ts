"use server";

import { after } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { dispatchNotificationEmails } from "@/lib/notifications";
import { createUserClient } from "@/lib/supabase/server";

export type NotificationItem = { id: string; kind: string; title: string; body: string; link: string; readAt: string | null; createdAt: string };
export type NotificationFeed = { ok: true; items: NotificationItem[]; unread: number } | { ok: false };

/**
 * The signed-in person's latest notifications. Also records the visit (for the
 * 7-day reminder) and, after responding, sends any queued notification emails.
 */
export async function getNotifications(): Promise<NotificationFeed> {
  if (!isSupabaseConfigured) return { ok: false };
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false };

  const [, list, unread] = await Promise.all([
    db.rpc("touch_last_seen"),
    db.from("notifications").select("id, kind, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(30),
    db.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  after(() => dispatchNotificationEmails().catch(() => 0));
  if (list.error) return { ok: false };
  return {
    ok: true,
    unread: unread.count ?? 0,
    items: (list.data ?? []).map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, readAt: n.read_at, createdAt: n.created_at })),
  };
}

/** Mark some (or, with no ids, all) of the viewer's notifications as read. */
export async function markNotificationsRead(ids?: string[]): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: false };
  const db = await createUserClient();
  const { error } = await db.rpc("mark_notifications_read", { p_ids: ids?.length ? ids.slice(0, 100) : null });
  return { ok: !error };
}

/** Delete one of the viewer's notifications (RLS limits it to their own). */
export async function deleteNotification(id: string): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: false };
  const db = await createUserClient();
  const { error } = await db.from("notifications").delete().eq("id", id);
  return { ok: !error };
}
