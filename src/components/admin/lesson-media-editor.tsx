"use client";

import { useState } from "react";
import { FileText, Film, Link2, Trash2 } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { isStoragePath, toEmbedUrl } from "@/lib/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { UploadButton, formatBytes } from "./upload-button";

const MB = 1024 * 1024;

/** Video + downloadable materials for one lesson, with direct uploads. */
export function LessonMediaEditor({ courseId, lesson, onChange }: { courseId: string; lesson: Lesson; onChange: (l: Lesson) => void }) {
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const folder = `${courseId}/${lesson.id}`;
  const canUpload = Boolean(courseId);
  const video = lesson.videoUrl ?? "";
  const videoOk = !video || isStoragePath(video) || Boolean(toEmbedUrl(video));
  const resources = lesson.resources ?? [];

  return (
    <div className="grid gap-4 rounded-xl border border-dashed border-line p-4 md:grid-cols-2">
      <section>
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
          <Film className="size-4 text-teal-600" aria-hidden /> Video (optional)
        </p>
        <p className="mt-0.5 text-xs text-muted">Paste a YouTube or Vimeo link (best for long videos), or upload a file up to 50 MB.</p>
        {isStoragePath(video) ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
            <Film className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">Uploaded video: {video.split("/").pop()?.replace(/^\d+-/, "")}</span>
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...lesson, videoUrl: "" })}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="mt-2 grid gap-2">
            <label htmlFor={`${lesson.id}-video`} className="sr-only">
              Video link
            </label>
            <Input
              id={`${lesson.id}-video`}
              placeholder="https://www.youtube.com/watch?v=…"
              value={video}
              onChange={(e) => onChange({ ...lesson, videoUrl: e.target.value.trim() })}
              aria-invalid={!videoOk}
            />
            {!videoOk ? <p className="text-xs font-medium text-red-600">Use a YouTube or Vimeo link.</p> : null}
            <UploadButton
              bucket="course-materials"
              folder={folder}
              accept="video/mp4,video/webm,video/quicktime"
              maxBytes={50 * MB}
              label="Upload a video"
              disabled={!canUpload}
              onUploaded={(f) => onChange({ ...lesson, videoUrl: `storage:${f.path}` })}
            />
          </div>
        )}
      </section>

      <section>
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
          <FileText className="size-4 text-teal-600" aria-hidden /> Notes, books & downloads
        </p>
        <p className="mt-0.5 text-xs text-muted">PDF, Word, slides, Excel, datasets… up to 50 MB each. Only enrolled learners can download them.</p>
        {resources.length ? (
          <ul className="mt-2 grid gap-1.5">
            {resources.map((r, i) => (
              <li key={`${r.url}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm">
                {r.url.startsWith("storage:") ? <FileText className="size-4 shrink-0" aria-hidden /> : <Link2 className="size-4 shrink-0" aria-hidden />}
                <label className="sr-only" htmlFor={`${lesson.id}-res-${i}`}>
                  Material name
                </label>
                <input
                  id={`${lesson.id}-res-${i}`}
                  value={r.label}
                  onChange={(e) => onChange({ ...lesson, resources: resources.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
                <button
                  type="button"
                  aria-label={`Remove ${r.label}`}
                  className="text-muted hover:text-red-600"
                  onClick={() => onChange({ ...lesson, resources: resources.filter((_, k) => k !== i) })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <UploadButton
            bucket="course-materials"
            folder={folder}
            maxBytes={50 * MB}
            label="Upload a file"
            disabled={!canUpload}
            onUploaded={(f) =>
              onChange({ ...lesson, resources: [...resources, { label: `${f.name} (${formatBytes(f.size)})`, url: `storage:${f.path}` }] })
            }
          />
        </div>
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input placeholder="Link name" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} aria-label="Link name" className="h-9" />
          <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} aria-label="Link address" className="h-9" />
          <Button
            size="sm"
            variant="outline"
            disabled={!linkLabel.trim() || !/^https?:\/\//.test(linkUrl.trim())}
            onClick={() => {
              onChange({ ...lesson, resources: [...resources, { label: linkLabel.trim(), url: linkUrl.trim() }] });
              setLinkLabel("");
              setLinkUrl("");
            }}
          >
            Add link
          </Button>
        </div>
      </section>
      {!canUpload ? <p className="text-xs text-amber-700 md:col-span-2">Save the course once to enable uploads.</p> : null}
      <p className="text-xs text-muted md:col-span-2">Remember to click “Save course” after adding videos or files.</p>
    </div>
  );
}
