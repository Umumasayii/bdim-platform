import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { createPublicClient, createUserClient } from "@/lib/supabase/server";
import type { LibraryItem } from "@/lib/types";

export const LIBRARY_TAG = "library";

function fromRow(r: Record<string, unknown>): LibraryItem {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? "",
    kind: r.kind as LibraryItem["kind"],
    filePath: (r.file_path as string) ?? "",
    fileName: (r.file_name as string) ?? "",
    fileSize: Number(r.file_size ?? 0),
    externalUrl: (r.external_url as string) ?? "",
    courseId: (r.course_id as string) ?? null,
    visibility: r.visibility as LibraryItem["visibility"],
    published: Boolean(r.published),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: r.created_at as string,
  };
}

/** Published items (metadata only — downloads are checked by storage policies). */
export async function getPublishedLibrary(): Promise<LibraryItem[]> {
  "use cache";
  cacheTag(LIBRARY_TAG);
  cacheLife("minutes");
  if (!isSupabaseConfigured) return [];
  const { data } = await createPublicClient().from("library_items").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false });
  return (data ?? []).map(fromRow);
}

/** All items, including drafts (staff session required). */
export async function getAllLibraryItems(): Promise<LibraryItem[]> {
  if (!isSupabaseConfigured) return [];
  const db = await createUserClient();
  const { data, error } = await db.from("library_items").select("*").order("sort_order").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}
