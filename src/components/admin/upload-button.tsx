"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
}

export const safeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-100);

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Uploads a file straight from the browser to Supabase Storage (the signed-in
 * user's permissions apply). `folder` is the path prefix inside the bucket.
 */
export function UploadButton({
  bucket,
  folder,
  accept,
  maxBytes,
  label = "Upload file",
  onUploaded,
  disabled,
  className,
}: {
  bucket: string;
  folder: string;
  accept?: string;
  maxBytes: number;
  label?: string;
  onUploaded: (file: UploadedFile) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const db = getBrowserSupabase();

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <label
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-navy-900 hover:border-teal-400 focus-within:ring-2 focus-within:ring-teal-200",
          (busy || disabled || !db) && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="size-4" aria-hidden />
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          disabled={busy || disabled || !db}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !db) return;
            setError(null);
            if (file.size > maxBytes) {
              setError(`That file is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`);
              return;
            }
            setBusy(true);
            const path = `${folder.replace(/\/+$/, "")}/${Date.now()}-${safeFileName(file.name)}`;
            const { error: err } = await db.storage.from(bucket).upload(path, file, { contentType: file.type || undefined, upsert: false });
            setBusy(false);
            if (err) setError(`Upload failed: ${err.message}`);
            else onUploaded({ path, name: file.name, size: file.size, type: file.type });
          }}
        />
      </label>
      {!db ? <span className="text-xs text-muted">Uploads need Supabase.</span> : null}
      {error ? (
        <span role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
