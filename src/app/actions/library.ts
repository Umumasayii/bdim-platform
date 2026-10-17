"use server";

import { isSupabaseConfigured, siteUrl } from "@/lib/config";
import { notifyStaff } from "@/lib/email";
import { createUserClient } from "@/lib/supabase/server";

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
