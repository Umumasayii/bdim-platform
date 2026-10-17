import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { TestimonialsEditor } from "@/components/admin/people-editors";

export const metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage() {
  await connection();
  await requireStaffPage({ adminOnly: true });
  const items = await getStore().listTestimonials({ includeUnpublished: true });
  return (
    <div className="grid max-w-4xl gap-6">
      <h1 className="text-3xl font-bold text-navy-950">Testimonials</h1>
      <TestimonialsEditor items={items} />
    </div>
  );
}
