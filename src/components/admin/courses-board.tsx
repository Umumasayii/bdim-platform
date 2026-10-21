"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Home, Pencil, Search, Trash2, Users } from "lucide-react";
import { moveCourse, setCourseFeatured, setCoursePublished } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { HOMEPAGE_FEATURED_COURSES as HOMEPAGE_SLOTS } from "@/lib/site";
import { useAdminAction } from "./admin-ui";
import { CourseDeleteDialog } from "./course-delete-dialog";

export interface CourseRow {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  categoryShort: string;
  level: string;
  lessons: number;
  modules: number;
  enrollmentMode: "open" | "approval";
  published: boolean;
  featured: boolean;
  enrolled: number;
  pending: number;
}


function Switch({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-sm text-navy-900 disabled:opacity-50"
    >
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-teal-600" : "bg-surface-2 ring-1 ring-inset ring-line")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]", checked ? "left-[1.125rem]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

export function CoursesBoard({ rows, categories, isAdmin }: { rows: CourseRow[]; categories: { id: string; short: string }[]; isAdmin: boolean }) {
  const { run, pending, message, clear } = useAdminAction();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [deleting, setDeleting] = useState<CourseRow | null>(null);

  // Homepage = published + featured, in course order; the first HOMEPAGE_SLOTS are shown.
  const homepage = rows.filter((r) => r.published && r.featured);
  const homepageRank = new Map(homepage.map((r, i) => [r.id, i + 1]));

  const filtering = Boolean(q.trim() || status || category);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!needle || `${r.title} ${r.slug}`.toLowerCase().includes(needle)) &&
        (!category || r.categoryId === category) &&
        (!status ||
          (status === "published" && r.published) ||
          (status === "hidden" && !r.published) ||
          (status === "homepage" && r.published && r.featured)),
    );
  }, [rows, q, status, category]);

  const act = (fn: () => ReturnType<typeof setCoursePublished>) => run(fn);

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "All courses", value: rows.length },
          { label: "Published", value: rows.filter((r) => r.published).length },
          { label: "Hidden (drafts)", value: rows.filter((r) => !r.published).length },
          { label: "On the homepage", value: `${Math.min(homepage.length, HOMEPAGE_SLOTS)} / ${HOMEPAGE_SLOTS}` },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-navy-950">{t.value}</p>
          </div>
        ))}
      </div>

      {homepage.length > HOMEPAGE_SLOTS ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {homepage.length} courses are marked for the homepage, but it shows {HOMEPAGE_SLOTS}. The first {HOMEPAGE_SLOTS} in the order below appear; move a course up to show it, or turn others off.
        </p>
      ) : null}

      {message}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <Input id="course-search" className="pl-10" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden (drafts)</option>
          <option value="homepage">On the homepage</option>
        </Select>
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.short}
            </option>
          ))}
        </Select>
      </div>
      <p className="-mt-2 text-sm text-muted" aria-live="polite">
        {shown.length} of {rows.length} courses{filtering ? " · clear the filters to change the order" : " · use the arrows to set the order on the website"}
      </p>

      <ul className="grid gap-3">
        {shown.map((r) => {
          const index = rows.indexOf(r);
          const rank = homepageRank.get(r.id);
          return (
            <li key={r.id} className={cn("rounded-2xl border bg-white p-4", r.published ? "border-line" : "border-dashed border-line opacity-90")}>
              <div className="flex gap-3">
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${r.title} up`}
                    disabled={pending || filtering || index === 0}
                    onClick={() => act(() => moveCourse(r.id, -1))}
                    className="grid size-8 place-items-center rounded-lg border border-line text-navy-900 hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${r.title} down`}
                    disabled={pending || filtering || index === rows.length - 1}
                    onClick={() => act(() => moveCourse(r.id, 1))}
                    className="grid size-8 place-items-center rounded-lg border border-line text-navy-900 hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/courses/${r.id}`} className="font-semibold text-navy-950 hover:text-teal-700 hover:underline">
                      {r.title}
                    </Link>
                    {r.published ? <Badge tone="green">Published</Badge> : <Badge>Hidden</Badge>}
                    {rank ? (
                      rank <= HOMEPAGE_SLOTS ? (
                        <Badge tone="teal">
                          <Home className="size-3" aria-hidden /> Homepage #{rank}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Homepage full (#{rank})</Badge>
                      )
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {r.categoryShort} · {r.level} · {r.modules} modules · {r.lessons} lessons · {r.enrollmentMode === "open" ? "Self-enroll" : "Approval needed"}
                  </p>
                  <Link href="/admin/learners" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-navy-800 hover:underline">
                    <Users className="size-3.5" aria-hidden /> {r.enrolled} enrolled{r.pending ? ` · ${r.pending} waiting for approval` : ""}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-3">
                    <Switch checked={r.published} label="Published" disabled={pending} onChange={(v) => act(() => setCoursePublished(r.id, v))} />
                    <Switch checked={r.featured} label="On homepage" disabled={pending} onChange={(v) => act(() => setCourseFeatured(r.id, v))} />
                    {r.featured && !r.published ? <span className="text-xs text-amber-800">Publish it to show it on the homepage</span> : null}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <Link href={`/admin/courses/${r.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm font-medium text-navy-900 hover:bg-surface">
                        <Pencil className="size-3.5" aria-hidden /> Edit
                      </Link>
                      {r.published ? (
                        <a
                          href={`/courses/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm font-medium text-navy-900 hover:bg-surface"
                        >
                          <ExternalLink className="size-3.5" aria-hidden /> View
                        </a>
                      ) : null}
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            clear();
                            setDeleting(r);
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm font-medium text-red-700 hover:border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" aria-hidden /> Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {deleting ? (
        <CourseDeleteDialog
          course={deleting}
          onClose={() => setDeleting(null)}
          onDone={(msg) => {
            setDeleting(null);
            // Show the result and refresh the list (the course is gone, or now hidden).
            run(async () => ({ ok: true, message: msg }));
          }}
        />
      ) : null}
    </div>
  );
}
