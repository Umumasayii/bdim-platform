import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/config";

/*
  Local development admin session — only active when Supabase is NOT
  configured and both LOCAL_ADMIN_PASSWORD and ADMIN_SESSION_SECRET are set.
  Production deployments should use Supabase accounts with staff_roles.
*/
export const LOCAL_ADMIN_COOKIE = "bdim_local_admin";
const MAX_AGE_SECONDS = 8 * 60 * 60;

const secret = () => process.env.ADMIN_SESSION_SECRET ?? "";
const password = () => process.env.LOCAL_ADMIN_PASSWORD ?? "";

export function isLocalAdminEnabled() {
  return !isSupabaseConfigured && password().length >= 8 && secret().length >= 32;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkLocalAdminPassword(input: string) {
  if (!isLocalAdminEnabled()) return false;
  return safeEqual(sign(`pw:${input}`), sign(`pw:${password()}`));
}

export function createLocalAdminToken(nowMs: number) {
  const exp = Math.floor(nowMs / 1000) + MAX_AGE_SECONDS;
  const payload = `admin.${exp}`;
  return { token: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export function verifyLocalAdminToken(token: string | undefined, nowMs: number) {
  if (!token || !isLocalAdminEnabled()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin" || !safeEqual(sig, sign(`${role}.${exp}`))) return false;
  return Number(exp) * 1000 > nowMs;
}
