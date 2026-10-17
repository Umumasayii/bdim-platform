import "server-only";
import { headers } from "next/headers";

/*
  Best-effort, in-memory rate limiting for public forms. It resets when the
  server restarts and is per-instance; put a CDN/WAF rule or a shared store
  (e.g. Upstash) in front for stronger protection in production.
*/
const hits = new Map<string, number[]>();

export async function rateLimit(bucket: string, limit: number, windowMs: number, nowMs: number) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(nowMs);
  hits.set(key, recent);
  return true;
}
