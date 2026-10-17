import Link from "next/link";
import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { isSupabaseConfigured } from "@/lib/config";
import { getAllLibraryItems, getPaymentSettings, orderFromRow } from "@/lib/data/library";
import { createServiceClient } from "@/lib/supabase/server";
import { getStore } from "@/lib/data/store";
import { Notice } from "@/components/ui/notice";
import { LibraryAdmin } from "@/components/admin/library-admin";
import { LibraryOrders, PaymentSettingsForm, type AdminOrder } from "@/components/admin/library-orders";
import { Collapsible } from "@/components/ui/collapsible";

export const metadata = { title: "Library" };

export default async function AdminLibraryPage() {
  await connection();
  await requireStaffPage();
  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Library</h1>
        <Notice tone="info">The library requires Supabase (file storage).</Notice>
      </div>
    );
  }
  const service = createServiceClient();
  const [items, courses, payment, orderRows, users] = await Promise.all([
    getAllLibraryItems(),
    getStore().listCourses({ includeUnpublished: true }),
    getPaymentSettings(),
    service.from("library_orders").select("*").order("created_at", { ascending: false }).limit(500),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const emails = new Map(users.data.users.map((u) => [u.id, u.email ?? ""]));
  const titles = new Map(items.map((i) => [i.id, i.title]));
  const orders: AdminOrder[] = (orderRows.data ?? []).map((r) => {
    const o = orderFromRow(r);
    return { ...o, itemTitle: titles.get(o.itemId) ?? "Deleted item", buyer: emails.get(o.userId) || "Unknown account" };
  });
  const waiting = orders.filter((o) => o.status === "pending").length;
  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-navy-950">Library — books, notes & files</h1>
      <p className="mb-6 mt-1 text-muted">
        Upload resources and choose who can open them. Learners find them on the{" "}
        <Link href="/library" className="font-semibold text-teal-700 underline">
          Library page
        </Link>
        . For files that belong to one lesson, upload them in the lesson editor instead.
      </p>
      <div className="grid gap-4">
        <Collapsible id="orders" eyebrow="Sales" title={`Book orders${waiting ? ` — ${waiting} awaiting confirmation` : ""}`} description="Confirm payments to unlock downloads." defaultOpen={waiting > 0}>
          <LibraryOrders orders={orders} />
        </Collapsible>
        <Collapsible id="payment" eyebrow="Sales" title="Payment details shown to buyers" description="Your Mobile Money number, bank details and instructions.">
          <PaymentSettingsForm initial={payment} />
        </Collapsible>
        <Collapsible id="items" eyebrow="Library" title={`Items (${items.length})`} description="Books, notes, slides, datasets and videos." defaultOpen>
          <LibraryAdmin items={items} courses={courses.map((c) => ({ id: c.id, title: c.title }))} />
        </Collapsible>
      </div>
    </div>
  );
}
