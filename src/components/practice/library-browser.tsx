"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Database, Download, ExternalLink, FileText, Film, Lock, Presentation, Search } from "lucide-react";
import type { LibraryItem, LibraryKind } from "@/lib/types";
import { useLearner } from "@/lib/learner/provider";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
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

export function LibraryBrowser({ items, courses }: { items: LibraryItem[]; courses: { id: string; slug: string; title: string }[] }) {
  const { mode, state } = useLearner();
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
  function access(it: LibraryItem): { ok: boolean; reason?: string; href?: string } {
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
                  ) : (
                    <Link href={a.href ?? "/sign-in"} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line px-3.5 text-sm font-semibold text-navy-900 hover:border-teal-400">
                      <Lock className="size-4" aria-hidden /> {a.reason}
                    </Link>
                  )}
                  {it.visibility !== "public" ? <Badge>{it.visibility === "members" ? "Members" : "Enrolled learners"}</Badge> : <Badge tone="teal">Free</Badge>}
                </div>
                {messages[it.id] ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-red-600">
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
