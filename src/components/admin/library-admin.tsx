"use client";

import { useState } from "react";
import { FileText, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import type { LibraryItem, LibraryKind, LibraryVisibility } from "@/lib/types";
import { deleteLibraryItem, saveLibraryItem } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./admin-ui";
import { UploadButton, formatBytes } from "./upload-button";

export const KIND_LABELS: Record<LibraryKind, string> = {
  book: "Book",
  notes: "Notes",
  slides: "Slides",
  video: "Video",
  dataset: "Dataset",
  other: "Other",
};
export const VISIBILITY_LABELS: Record<LibraryVisibility, string> = {
  public: "Everyone",
  members: "Signed-in members",
  enrolled: "Enrolled learners only",
};

const blank = (): LibraryItem => ({
  id: "",
  title: "",
  description: "",
  kind: "notes",
  filePath: "",
  fileName: "",
  fileSize: 0,
  externalUrl: "",
  courseId: null,
  visibility: "members",
  price: 0,
  currency: "RWF",
  published: true,
  sortOrder: 0,
  createdAt: "",
});

function ItemForm({ initial, courses, onDone }: { initial: LibraryItem; courses: { id: string; title: string }[]; onDone: () => void }) {
  const [item, setItem] = useState(initial);
  const { run, pending, message } = useAdminAction();
  const set = <K extends keyof LibraryItem>(k: K, v: LibraryItem[K]) => setItem((x) => ({ ...x, [k]: v }));
  const fid = item.id || "new";
  return (
    <div className="grid gap-4">
      {message}
      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <Field label="Title" htmlFor={`${fid}-t`} required>
          <Input id={`${fid}-t`} value={item.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Introduction to Regression — lecture notes" />
        </Field>
        <Field label="Type" htmlFor={`${fid}-k`}>
          <Select id={`${fid}-k`} value={item.kind} onChange={(e) => set("kind", e.target.value as LibraryKind)}>
            {Object.entries(KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Short description" htmlFor={`${fid}-d`}>
        <Textarea id={`${fid}-d`} rows={2} value={item.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <div className="rounded-xl border border-dashed border-line p-4">
        <p className="text-sm font-semibold text-navy-950">File or link</p>
        {item.filePath ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <FileText className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {item.fileName} ({formatBytes(item.fileSize)})
            </span>
            <Button size="sm" variant="ghost" onClick={() => setItem((x) => ({ ...x, filePath: "", fileName: "", fileSize: 0 }))}>
              Replace
            </Button>
          </div>
        ) : (
          <div className="mt-2 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
            <UploadButton
              bucket="library"
              folder="items"
              maxBytes={50 * 1024 * 1024}
              label="Upload a file (max 50 MB)"
              onUploaded={(f) => setItem((x) => ({ ...x, filePath: f.path, fileName: f.name, fileSize: f.size, externalUrl: "" }))}
            />
            <div className={item.price > 0 ? "hidden" : undefined}>
              <label htmlFor={`${fid}-u`} className="sr-only">
                Or a link
              </label>
              <Input id={`${fid}-u`} placeholder="…or paste a link (YouTube, Google Drive, website)" value={item.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 rounded-xl bg-surface p-4 md:grid-cols-[12rem_1fr] md:items-end">
        <Field label="Price (0 = free)" htmlFor={`${fid}-pr`}>
          <div className="flex items-center gap-2">
            <Input id={`${fid}-pr`} type="number" min={0} step={100} value={item.price} onChange={(e) => set("price", Math.max(0, Number(e.target.value)))} />
            <span className="text-sm font-semibold text-muted">{item.currency}</span>
          </div>
        </Field>
        <p className="text-sm text-muted">
          {item.price > 0
            ? "For sale: learners order it, pay by Mobile Money or bank, and the download unlocks when you confirm the payment below. Items for sale must be an uploaded file."
            : "Free: who can open it is set by the option below."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={item.price > 0 ? "Who can open it (ignored — buyers only)" : "Who can open it"} htmlFor={`${fid}-v`}>
          <Select id={`${fid}-v`} value={item.visibility} onChange={(e) => set("visibility", e.target.value as LibraryVisibility)}>
            {Object.entries(VISIBILITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={item.visibility === "enrolled" ? "Course (required)" : "Related course (optional)"} htmlFor={`${fid}-c`}>
          <Select id={`${fid}-c`} value={item.courseId ?? ""} onChange={(e) => set("courseId", e.target.value || null)}>
            <option value="">None</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order (lower first)" htmlFor={`${fid}-o`}>
          <Input id={`${fid}-o`} type="number" value={item.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-teal-600" checked={item.published} onChange={(e) => set("published", e.target.checked)} />
          Published (visible in the library)
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button variant="teal" disabled={pending} onClick={() => run(() => saveLibraryItem(item), onDone)}>
            {item.id ? "Save changes" : "Add to library"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LibraryAdmin({ items, courses }: { items: LibraryItem[]; courses: { id: string; title: string }[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const { run, pending, message } = useAdminAction();
  const courseTitle = (id: string | null) => courses.find((c) => c.id === id)?.title;
  return (
    <div className="grid gap-4">
      {message}
      {editing === "new" ? (
        <div className="rounded-2xl border border-teal-200 bg-white p-5">
          <ItemForm initial={blank()} courses={courses} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <div>
          <Button variant="teal" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Add a book, notes or file
          </Button>
        </div>
      )}
      {items.length ? (
        <ul className="grid gap-3">
          {items.map((it) =>
            editing === it.id ? (
              <li key={it.id} className="rounded-2xl border border-teal-200 bg-white p-5">
                <ItemForm initial={it} courses={courses} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={it.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  {it.filePath ? <FileText className="size-5" aria-hidden /> : <Link2 className="size-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-950">{it.title}</p>
                  <p className="text-xs text-muted">
                    {KIND_LABELS[it.kind]} · {it.price > 0 ? `For sale · ${it.price.toLocaleString("en-US")} ${it.currency}` : VISIBILITY_LABELS[it.visibility]}
                    {courseTitle(it.courseId) ? ` · ${courseTitle(it.courseId)}` : ""}
                    {it.fileSize ? ` · ${formatBytes(it.fileSize)}` : ""} · added {formatDate(it.createdAt)}
                  </p>
                </div>
                {it.published ? <Badge tone="green">Published</Badge> : <Badge>Draft</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setEditing(it.id)}>
                  <Pencil className="size-4" aria-hidden /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => window.confirm(`Delete “${it.title}”${it.filePath ? " and its file" : ""}?`) && run(() => deleteLibraryItem(it.id, it.filePath))}
                >
                  <Trash2 className="size-4" aria-hidden /> Delete
                </Button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <EmptyState title="The library is empty">Add books, lecture notes, slides, datasets or video links for your learners.</EmptyState>
      )}
    </div>
  );
}
