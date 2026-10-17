"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Clock, Loader2, MapPin } from "lucide-react";
import type { BookableService } from "@/lib/types";
import type { SlotDay } from "@/lib/booking";
import { createBooking, getAvailableSlots } from "@/app/actions/forms";
import { bookingSchema, type BookingInput } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { SlotPicker } from "./slot-picker";

type Done = { reference: string; status: string; manageUrl: string; when: string; emailed: boolean };

export function BookingFlow({ services, enabled }: { services: BookableService[]; enabled: boolean }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  // Availability is keyed by service; "loading" is derived rather than stored.
  const [availability, setAvailability] = useState<{
    serviceId: string;
    slots: { days: SlotDay[]; timeZoneLabel: string } | null;
    error: string | null;
  } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { serviceId, startsAt: "", name: "", email: "", phone: "", organization: "", notes: "", website: "" },
  });
  const { register, handleSubmit, setValue, setError, formState, control } = form;
  const startsAt = useWatch({ control, name: "startsAt" });
  const service = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!enabled || !serviceId) return;
    let cancelled = false;
    getAvailableSlots(serviceId).then((res) => {
      if (cancelled) return;
      setAvailability(
        res.ok
          ? { serviceId, slots: { days: res.days, timeZoneLabel: res.timeZoneLabel }, error: null }
          : { serviceId, slots: null, error: res.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, enabled]);

  const current = availability?.serviceId === serviceId ? availability : null;
  const loadingSlots = !current;
  const slots = current?.slots ?? null;
  const slotError = current?.error ?? null;

  async function onSubmit(values: BookingInput) {
    setServerError(null);
    const res = await createBooking(values);
    if (!res.ok) {
      setServerError(res.message);
      Object.entries(res.errors ?? {}).forEach(([k, m]) => setError(k as keyof BookingInput, { message: m }));
      // Refresh availability in case the slot was just taken.
      const fresh = await getAvailableSlots(values.serviceId);
      if (fresh.ok) setAvailability({ serviceId: values.serviceId, slots: { days: fresh.days, timeZoneLabel: fresh.timeZoneLabel }, error: null });
      setValue("startsAt", "");
      return;
    }
    setDone(res);
  }

  if (!enabled) {
    return (
      <Notice tone="info" title="Online booking is not open yet">
        Please <Link href="/contact" className="font-semibold underline">send us a request</Link> and we will arrange a time with you.
      </Notice>
    );
  }

  if (done) {
    const confirmed = done.status === "confirmed";
    return (
      <div className="rounded-2xl border border-leaf-200 bg-leaf-50 p-6 sm:p-8">
        <CalendarCheck className="size-8 text-leaf-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-bold text-navy-950">{confirmed ? "Your session is booked" : "Booking request received"}</h2>
        <p className="mt-2 text-navy-900">
          {service?.title} · {done.when}
        </p>
        <p className="mt-1 text-sm text-navy-800">
          Reference <strong>{done.reference}</strong> · Status: <strong>{confirmed ? "confirmed" : "pending confirmation by BDIM"}</strong>
        </p>
        <p className="mt-3 text-sm text-muted">
          {done.emailed
            ? "We have emailed you the details."
            : "Email notifications are not configured yet — please save the reference and the link below."}{" "}
          {!confirmed ? "The time is reserved for you while BDIM reviews the request." : ""}
        </p>
        <Link href={done.manageUrl} className="mt-5 inline-block text-sm font-semibold text-teal-700 underline">
          Manage, reschedule or cancel this booking
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8">
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}
      <fieldset>
        <legend className="text-lg font-bold text-navy-950">1. Choose a service</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {services.map((s) => (
            <label
              key={s.id}
              className={cn(
                "cursor-pointer rounded-2xl border p-4 transition-colors",
                serviceId === s.id ? "border-teal-500 bg-teal-50" : "border-line bg-white hover:bg-surface",
              )}
            >
              <input
                type="radio"
                name="service"
                value={s.id}
                checked={serviceId === s.id}
                onChange={() => {
                  setServiceId(s.id);
                  setValue("serviceId", s.id);
                  setValue("startsAt", "");
                }}
                className="sr-only"
              />
              <span className="font-semibold text-navy-950">{s.title}</span>
              <span className="mt-1 block text-sm text-muted">{s.description}</span>
              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-800">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden /> {s.durationMinutes} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {s.mode}
                </span>
                <span>{s.pricingNote}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold text-navy-950">2. Pick a time</legend>
        <div className="mt-3">
          {loadingSlots ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading availability…
            </p>
          ) : slotError ? (
            <Notice tone="warning">{slotError}</Notice>
          ) : slots ? (
            <SlotPicker key={serviceId} days={slots.days} timeZoneLabel={slots.timeZoneLabel} value={startsAt} onChange={(v) => setValue("startsAt", v, { shouldValidate: true })} />
          ) : null}
          {formState.errors.startsAt ? (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600">
              {formState.errors.startsAt.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="text-lg font-bold text-navy-950">3. Your details</legend>
        <div className="hidden" aria-hidden>
          <label htmlFor="bk-website">Website</label>
          <input id="bk-website" tabIndex={-1} autoComplete="off" {...register("website")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="bk-name" error={formState.errors.name?.message} required>
            <Input id="bk-name" autoComplete="name" {...register("name")} aria-invalid={Boolean(formState.errors.name)} />
          </Field>
          <Field label="Email" htmlFor="bk-email" error={formState.errors.email?.message} required>
            <Input id="bk-email" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(formState.errors.email)} />
          </Field>
          <Field label="Phone / WhatsApp" htmlFor="bk-phone">
            <Input id="bk-phone" type="tel" autoComplete="tel" {...register("phone")} />
          </Field>
          <Field label="Organization (optional)" htmlFor="bk-org">
            <Input id="bk-org" autoComplete="organization" {...register("organization")} />
          </Field>
        </div>
        <Field label="What would you like to cover?" htmlFor="bk-notes" hint="Please don't include confidential data. You can share files after we confirm.">
          <Textarea id="bk-notes" rows={4} {...register("notes")} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-teal-600" {...register("consent")} />
            <span>
              I agree that BDIM may store these details to manage my booking, as described in the{" "}
              <Link href="/privacy" className="font-medium text-teal-700 underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {formState.errors.consent ? (
            <p role="alert" className="mt-1 text-xs font-medium text-red-600">
              {formState.errors.consent.message}
            </p>
          ) : null}
        </div>
      </fieldset>

      <div>
        <Button type="submit" variant="teal" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving booking…" : "Request this booking"}
        </Button>
      </div>
    </form>
  );
}
