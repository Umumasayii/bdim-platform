import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getStore } from "@/lib/data/store";
import { currentTimeMs, formatDateTime } from "@/lib/utils";
import { Container } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { ManageBooking } from "@/components/booking/manage-booking";

export const metadata: Metadata = { title: "Manage booking", robots: { index: false, follow: false } };

async function BookingDetails({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const store = getStore();
  const booking = await store.getBookingByToken(token);
  if (!booking) notFound();
  const [services, settings] = await Promise.all([store.listBookableServices({ includeUnpublished: false }).catch(() => []), store.getBookingSettings()]);
  const service = services.find((s) => s.id === booking.serviceId);
  const tone = booking.status === "confirmed" ? "green" : booking.status === "cancelled" ? "red" : "amber";
  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-950">{service?.title ?? "Booking"}</h1>
        <Badge tone={tone}>{booking.status === "pending" ? "Pending confirmation" : booking.status}</Badge>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">When</dt>
          <dd className="font-medium text-navy-950">
            {formatDateTime(booking.startsAt, settings.utcOffset)} ({settings.timeZoneLabel})
          </dd>
        </div>
        <div>
          <dt className="text-muted">Reference</dt>
          <dd className="font-medium text-navy-950">{booking.reference}</dd>
        </div>
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="font-medium text-navy-950">{booking.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="font-medium text-navy-950">{booking.email}</dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-line pt-6">
        <ManageBooking token={token} status={booking.status} isPast={new Date(booking.startsAt).getTime() < currentTimeMs()} />
      </div>
    </div>
  );
}

export default function ManageBookingPage({ params }: PageProps<"/bookings/[token]">) {
  return (
    <Container className="max-w-3xl py-12">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}>
        <BookingDetails params={params} />
      </Suspense>
    </Container>
  );
}
