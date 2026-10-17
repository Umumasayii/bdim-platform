import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { InquiriesList } from "@/components/admin/ops-editors";

export const metadata = { title: "Inquiries" };

export default async function AdminInquiriesPage() {
  await connection();
  await requireStaffPage({ adminOnly: true });
  const inquiries = await getStore().listInquiries();
  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-3xl font-bold text-navy-950">Inquiries</h1>
      <InquiriesList inquiries={inquiries} />
    </div>
  );
}
