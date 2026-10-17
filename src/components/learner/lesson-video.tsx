"use client";

import { useEffect, useState } from "react";
import { getMaterialUrl } from "@/app/actions/learning";
import { isStoragePath, toEmbedUrl } from "@/lib/video";
import { Notice } from "@/components/ui/notice";

export function LessonVideo({ url, title }: { url: string; title: string }) {
  const embed = isStoragePath(url) ? null : toEmbedUrl(url);
  const [signed, setSigned] = useState<{ url: string } | { error: string } | null>(null);

  useEffect(() => {
    if (!isStoragePath(url)) return;
    let cancelled = false;
    getMaterialUrl(url.slice("storage:".length)).then((res) => {
      if (!cancelled) setSigned(res.ok ? { url: res.url } : { error: res.message });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={embed}
          title={`Video: ${title}`}
          className="size-full"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (!isStoragePath(url)) return null;
  if (!signed) return <div className="aspect-video animate-pulse rounded-xl bg-surface-2" aria-label="Loading video" />;
  if ("error" in signed) return <Notice tone="warning">{signed.error}</Notice>;
  return (
    <video controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" src={signed.url}>
      Your browser can&apos;t play this video.
    </video>
  );
}
