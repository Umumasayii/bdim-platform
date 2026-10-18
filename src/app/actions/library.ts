"use server";

import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { notifyStaff } from "@/lib/email";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

export type OrderResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * A signed-in learner orders a paid library item. The order stays "pending"
 * until staff confirm the payment in Admin → Library (RLS enforces this).
 */
export async function placeLibraryOrder(input: { itemId: string; payerPhone: string; paymentReference: string; note: string }): Promise<OrderResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "Purchases need an online account." };
  const db = await createUserClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in to buy." };
  const payerPhone = input.payerPhone.trim().slice(0, 30);
  if (!/^[+\d][\d\s-]{6,}$/.test(payerPhone)) return { ok: false, message: "Enter the phone number you pay from (e.g. 078…)." };

  const { data: item } = await db.from("library_items").select("id, title, price, currency, published").eq("id", input.itemId).maybeSingle();
  if (!item?.published || !(Number(item.price) > 0)) return { ok: false, message: "This item is not for sale." };

  const { error } = await db.from("library_orders").insert({
    item_id: item.id,
    user_id: user.id,
    amount: item.price,
    currency: item.currency,
    payer_phone: payerPhone,
    payment_reference: input.paymentReference.trim().slice(0, 80),
    note: input.note.trim().slice(0, 500),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "You already have an order for this item." };
    return { ok: false, message: error.message };
  }

  const amount = `${Number(item.price).toLocaleString("en-US")} ${item.currency}`;
  await notifyStaff(
    `New library order: ${item.title} (${amount})`,
    `${user.email} ordered "${item.title}" for ${amount}.\n\nPaid from: ${payerPhone}\nTransaction reference: ${input.paymentReference.trim() || "—"}\n${input.note.trim() ? `Note: ${input.note.trim()}\n` : ""}\nCheck the payment, then confirm it: ${siteUrl}/admin/library#orders`,
    user.email,
  ).catch(() => {});
  return { ok: true, message: "Order sent. Your download unlocks as soon as we confirm the payment — you'll get an email." };
}

const PREVIEW_PAGES = 5;

export type PreviewResult =
  | { ok: true; url: string; full: true; downloadUrl: string }
  | { ok: true; url: string; full: false; pages: number; totalPages: number }
  | { ok: false; message: string; signIn?: boolean };

const isPdf = (name: string) => /\.pdf$/i.test(name);

/**
 * A short-lived link for reading a library file in the site's viewer.
 * Free items (and paid ones the viewer bought) open in full; other paid PDFs
 * get a copy of their first pages, cut on the server so the full file never
 * reaches the browser before payment.
 */
export async function getLibraryPreview(itemId: string): Promise<PreviewResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "The library is not available yet." };
  const db = await createUserClient();
  const { data: item } = await db.from("library_items").select("id, title, file_path, file_name, price, published").eq("id", itemId).maybeSingle();
  if (!item?.published) return { ok: false, message: "This item is not available." };
  if (!item.file_path) return { ok: false, message: "This item is a link, not a file." };

  // Full access: storage policies decide (visibility, enrollment, purchase, staff).
  const [view, download] = await Promise.all([
    db.storage.from("library").createSignedUrl(item.file_path, 60 * 30),
    db.storage.from("library").createSignedUrl(item.file_path, 60 * 30, { download: item.file_name || true }),
  ]);
  if (view.data && download.data) return { ok: true, full: true, url: view.data.signedUrl, downloadUrl: download.data.signedUrl };

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!(Number(item.price) > 0)) {
    return user ? { ok: false, message: "This item is only for learners enrolled in its course." } : { ok: false, message: "Sign in to read this item.", signIn: true };
  }
  if (!isPdf(item.file_name || item.file_path)) return { ok: false, message: "A preview is only available for PDF books." };

  try {
    return await paidPreview(item.id, item.file_path);
  } catch (err) {
    console.error("Preview failed:", (err as Error).message);
    return { ok: false, message: "The preview could not be prepared. Please try again later." };
  }
}

/** First pages of a paid PDF, cached in storage as previews/<id>-<file hash>-<total pages>.pdf. */
async function paidPreview(itemId: string, filePath: string): Promise<PreviewResult> {
  const storage = createServiceClient().storage.from("library");
  const key = `${itemId}-${createHash("sha1").update(filePath).digest("hex").slice(0, 10)}`;
  const { data: cached } = await storage.list("previews", { search: key, limit: 1 });
  let name = cached?.[0]?.name;
  if (!name) {
    const { data: blob, error } = await storage.download(filePath);
    if (error || !blob) throw new Error(error?.message ?? "file missing");
    const source = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
    const total = source.getPageCount();
    const preview = await PDFDocument.create();
    const pages = await preview.copyPages(source, Array.from({ length: Math.min(PREVIEW_PAGES, total) }, (_, i) => i));
    pages.forEach((p) => preview.addPage(p));
    preview.setTitle(`${source.getTitle() ?? "Preview"} (preview)`);
    name = `${key}-${total}.pdf`;
    const { error: upErr } = await storage.upload(`previews/${name}`, await preview.save(), { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);
  }
  const totalPages = Number(name.replace(/\.pdf$/, "").split("-").pop()) || 0;
  const { data: signed, error } = await storage.createSignedUrl(`previews/${name}`, 60 * 30);
  if (error || !signed) throw new Error(error?.message ?? "sign failed");
  return { ok: true, full: false, url: signed.signedUrl, pages: Math.min(PREVIEW_PAGES, totalPages || PREVIEW_PAGES), totalPages };
}
