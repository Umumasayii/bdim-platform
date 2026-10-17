import { connection } from "next/server";
import { requireStaffPage } from "@/lib/auth/viewer";
import { getStore } from "@/lib/data/store";
import { currentTimeMs } from "@/lib/utils";
import { BookingsList, ScheduleEditor, ServicesEditor } from "@/components/admin/ops-editors";

export const metadata = { title: "Bookings" };

export default async function AdminBookingsPage() {
  await connection();
  await requireStaffPage({ adminOnly: true });
  const store = getStore();
  const [bookings, services, settings, instructors] = await Promise.all([
    store.listBookings(),
    store.listBookableServices({ includeUnpublished: true }),
    store.getBookingSettings(),
    store.listInstructors({ includeUnpublished: true }),
  ]);
  return (
    <div className="grid gap-10">
      <section>
        <h1 className="mb-6 text-3xl font-bold text-navy-950">Bookings</h1>
        <BookingsList bookings={bookings} services={services} offset={settings.utcOffset} nowMs={currentTimeMs()} />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-navy-950">Weekly availability</h2>
        <ScheduleEditor settings={settings} />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-navy-950">Bookable services</h2>
        <ServicesEditor services={services} instructors={instructors} />
      </section>
    </div>
  );
}
