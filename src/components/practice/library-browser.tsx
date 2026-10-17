"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Clock, Database, Download, ExternalLink, FileText, Film, Lock, Presentation, Search, ShoppingCart } from "lucide-react";
import type { LibraryItem, LibraryKind, LibraryOrderStatus, PaymentSettings } from "@/lib/types";
import { placeLibraryOrder } from "@/app/actions/library";
import { useLearner } from "@/lib/learner/provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

const KIND: Record<LibraryKind, { label: string; icon: typeof BookOpen }> = {
  book: { label: "Book", icon: BookOpen },
  notes: { label: "Notes", icon: FileText },
  slides: { label: "Slides", icon: Presentation },
  video: { label: "Video", icon: Film },
  dataset: { label: "Dataset", icon: Database },
  other: { label: "Resource", icon: FileText },
};

function formatBytes(n: number) {
  if (!n) return "";
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const formatPrice = (amount: number, currency: string) => `${amount.toLocaleString("en-US")} ${currency}`;

function BuyForm({ item, payment, onDone }: { item: LibraryItem; payment: PaymentSettings; onDone: (msg: string) => void }) {
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `buy-${item.id}`;
  return (
    <div className="mt-4 grid gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-sm">
      <div>
        <p className="font-semibold text-navy-950">1. Pay {formatPrice(item.price, item.currency)}</p>
        {payment.momoNumber ? (
          <p className="mt-1 text-navy-900">
            Mobile Money: <strong>{payment.momoNumber}</strong>
            {payment.momoName ? ` (${payment.momoName})` : ""}
          </p>
        ) : null}
        {payment.bankDetails ? <p className="mt-1 whitespace-pre-line text-navy-900">{payment.bankDetails}</p> : null}
        {payment.instructions ? <p className="mt-1 whitespace-pre-line text-muted">{payment.instructions}</p> : null}
        {!payment.momoNumber && !payment.bankDetails ? (
          <p className="mt-1 text-muted">Send your order and we will contact you with payment details.</p>
        ) : null}
      </div>
      <p className="font-semibold text-navy-950">2. Tell us how you paid</p>
      <div>
        <label htmlFor={`${id}-p`} className="mb-1 block text-xs font-medium">
          Phone number you paid from *
        </label>
        <Input id={`${id}-p`} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" />
      </div>
      <div>
        <label htmlFor={`${id}-r`} className="mb-1 block text-xs font-medium">
          Transaction ID from the payment SMS (optional)
        </label>
        <Input id={`${id}-r`} value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`${id}-n`} className="mb-1 block text-xs font-medium">
          Note (optional)
        </label>
        <Textarea id={`${id}-n`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
      <div>
        <Button
          variant="teal"
          size="sm"
          disabled={busy || !phone.trim()}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await placeLibraryOrder({ itemId: item.id, payerPhone: phone, paymentReference: reference, note });
            setBusy(false);
            if (res.ok) onDone(res.message);
            else setError(res.message);
          }}
        >
          {busy ? "Sending…" : "Send my order"}
        </Button>
      </div>
    </div>
  );
}

export function LibraryBrowser({ items, courses, payment }: { items: LibraryItem[]; courses: { id: string; slug: string; title: string }[]; payment: PaymentSettings }) {
  const { mode, state, user } = useLearner();
  const [orders, setOrders] = useState<Record<string, LibraryOrderStatus>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const loadOrders = useCallback(async () => {
    const db = getBrowserSupabase();
    if (!db || !user) return;
    const { data } = await db.from("library_orders").select("item_id, status").eq("user_id", user.id).neq("status", "cancelled");
    setOrders(Object.fromEntries((data ?? []).map((o) => [o.item_id as string, o.status as LibraryOrderStatus])));
  }, [user]);
  useEffect(() => {
    // Fetches the learner's orders (external data) when they sign in.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
  }, [loadOrders]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const course = (id: string | null) => courses.find((c) => c.id === id);
  const signedIn = mode === "member";

  const list = useMemo(
    () =>
      items.filter(
        (it) => (!kind || it.kind === kind) && (!q.trim() || `${it.title} ${it.description}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [items, q, kind],
  );

  /** Whether this visitor is expected to be able to open the item (the server makes the final decision). */
  function access(it: LibraryItem): { ok: boolean; reason?: string; href?: string; buy?: boolean; pending?: boolean } {
    if (it.price > 0) {
      if (state.role || orders[it.id] === "paid") return { ok: true };
      if (!signedIn) return { ok: false, reason: `Sign in to buy · ${formatPrice(it.price, it.currency)}`, href: "/sign-in?next=/library" };
      return orders[it.id] === "pending" ? { ok: false, pending: true } : { ok: false, buy: true };
    }
    if (it.visibility === "public") return { ok: true };
    if (!signedIn) return { ok: false, reason: "Sign in to open", href: "/sign-in?next=/library" };
    if (it.visibility === "members") return { ok: true };
    const enrolled = it.courseId && ["active", "completed"].includes(state.enrollments[it.courseId]?.status ?? "");
    const c = course(it.courseId);
    return enrolled ? { ok: true } : { ok: false, reason: `For ${c?.title ?? "course"} learners`, href: c ? `/courses/${c.slug}` : "/courses" };
  }

  async function open(it: LibraryItem) {
    if (it.externalUrl) {
      window.open(it.externalUrl, "_blank", "noopener");
      return;
    }
    const db = getBrowserSupabase();
    if (!db) return;
    setBusy(it.id);
    const { data, error } = await db.storage.from("library").createSignedUrl(it.filePath, 600, { download: it.kind !== "video" ? it.fileName || true : false });
    setBusy(null);
    if (error || !data) setMessages((m) => ({ ...m, [it.id]: "You don't have access to this file." }));
    else window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="lib-search" className="sr-only">
            Search the library
          </label>
          <Input id="lib-search" type="search" placeholder="Search books, notes, datasets…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(KIND).map(([v, k]) => (
            <option key={v} value={v}>
              {k.label}
            </option>
          ))}
        </Select>
      </div>
      {list.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => {
            const K = KIND[it.kind];
            const a = access(it);
            const c = course(it.courseId);
            return (
              <li key={it.id} className="flex flex-col rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <K.icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold leading-snug text-navy-950">{it.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {K.label}
                      {it.fileSize ? ` · ${formatBytes(it.fileSize)}` : ""}
                      {c ? ` · ${c.title}` : ""}
                    </p>
                  </div>
                </div>
                {it.description ? <p className="mt-3 text-sm leading-relaxed text-muted">{it.description}</p> : null}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {a.ok ? (
                    <button
                      type="button"
                      onClick={() => void open(it)}
                      disabled={busy === it.id}
                      className={cn("inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white hover:bg-teal-700", busy === it.id && "opacity-60")}
                    >
                      {it.externalUrl ? <ExternalLink className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
                      {busy === it.id ? "Opening…" : it.externalUrl ? "Open" : it.kind === "video" ? "Watch" : "Download"}
                    </button>
                  ) : a.pending ? (
                    <span className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-50 px-3.5 text-sm font-semibold text-amber-800">
                      <Clock className="size-4" aria-hidden /> Payment being confirmed
                    </span>
                  ) : a.buy ? (
                    <button
                      type="button"
                      onClick={() => setBuying(buying === it.id ? null : it.id)}
                      aria-expanded={buying === it.id}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      <ShoppingCart className="size-4" aria-hidden /> Buy · {formatPrice(it.price, it.currency)}
                    </button>
                  ) : (
                    <Link href={a.href ?? "/sign-in"} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3.5 text-sm font-semibold text-navy-900 hover:border-teal-400">
                      <Lock className="size-4" aria-hidden /> {a.reason}
                    </Link>
                  )}
                  {it.price > 0 ? (
                    <Badge tone="amber">{formatPrice(it.price, it.currency)}</Badge>
                  ) : it.visibility !== "public" ? (
                    <Badge>{it.visibility === "members" ? "Members" : "Enrolled learners"}</Badge>
                  ) : (
                    <Badge tone="teal">Free</Badge>
                  )}
                </div>
                {buying === it.id && a.buy ? (
                  <BuyForm
                    item={it}
                    payment={payment}
                    onDone={(msg) => {
                      setBuying(null);
                      setMessages((m) => ({ ...m, [it.id]: msg }));
                      void loadOrders();
                    }}
                  />
                ) : null}
                {messages[it.id] ? (
                  <p role="status" className="mt-2 text-xs font-medium text-navy-800">
                    {messages[it.id]}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState title={items.length ? "Nothing matches your search" : "The library is being stocked"}>
            {items.length ? "Try another word or type." : "Books, notes and datasets will appear here soon."}
          </EmptyState>
        </div>
      )}
    </div>
  );
}
