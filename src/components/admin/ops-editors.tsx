"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BookableService, Booking, BookingSettings, BookingStatus, Inquiry, InquiryStatus, InstructorProfile } from "@/lib/types";
import { saveBookableService, saveBookingSettings, updateBookingStatus, updateInquiry } from "@/app/actions/admin";
import { formatDateTime, formatDate, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { EmptyState } from "@/components/ui/layout";
import { useAdminAction } from "./admin-ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const statusTone = { pending: "amber", confirmed: "green", cancelled: "red", completed: "gray" } as const;

function BookingRow({ b, serviceTitle, offset }: { b: Booking; serviceTitle: string; offset: string }) {
  const [note, setNote] = useState(b.adminNote);
  const { run, pending, message } = useAdminAction();
  const set = (status: BookingStatus) => run(() => updateBookingStatus(b.id, status, note));
  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      {message}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">
            {serviceTitle} · {formatDateTime(b.startsAt, offset)}
          </p>
          <p className="text-sm text-muted">
            {b.name} · <a href={`mailto:${b.email}`} className="underline">{b.email}</a>
            {b.phone ? ` · ${b.phone}` : ""}
            {b.organization ? ` · ${b.organization}` : ""}
          </p>
          <p className="text-xs text-muted">Ref {b.reference} · requested {formatDate(b.createdAt)}</p>
        </div>
        <Badge tone={statusTone[b.status]}>{b.status}</Badge>
      </div>
      {b.notes ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{b.notes}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field label="Note to include in the status email" htmlFor={`bn-${b.id}`}>
          <Input id={`bn-${b.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. meeting link or venue" />
        </Field>
        <div className="flex flex-wrap gap-2">
          {b.status !== "confirmed" && b.status !== "cancelled" ? (
            <Button size="sm" variant="teal" disabled={pending} onClick={() => set("confirmed")}>
              Confirm
            </Button>
          ) : null}
          {b.status === "confirmed" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => set("completed")}>
              Mark completed
            </Button>
          ) : null}
          {b.status !== "cancelled" && b.status !== "completed" ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm("Cancel this booking?") && set("cancelled")}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function BookingsList({ bookings, services, offset, nowMs }: { bookings: Booking[]; services: BookableService[]; offset: string; nowMs: number }) {
  const [view, setView] = useState<"upcoming" | "past" | "all">("upcoming");
  const list = bookings.filter((b) => (view === "all" ? true : view === "upcoming" ? Date.parse(b.endsAt) >= nowMs : Date.parse(b.endsAt) < nowMs));
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Bookings">
        {(["upcoming", "past", "all"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-white shadow-sm" : "text-muted"}`}>
            {v}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="grid gap-3">
          {list.map((b) => (
            <BookingRow key={b.id} b={b} offset={offset} serviceTitle={services.find((s) => s.id === b.serviceId)?.title ?? b.serviceId} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No bookings here" />
      )}
    </div>
  );
}

export function ScheduleEditor({ settings }: { settings: BookingSettings }) {
  const [s, setS] = useState(settings);
  const [blackout, setBlackout] = useState(settings.blackoutDates.join("\n"));
  const { run, pending, message } = useAdminAction();
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-white p-5">
      {message}
      {!settings.reviewed ? <Notice tone="warning">This is the default schedule. Adjust it to BDIM&apos;s real availability and save.</Notice> : null}
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> Online booking open
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={s.autoConfirm} onChange={(e) => setS({ ...s, autoConfirm: e.target.checked })} /> Confirm bookings
          automatically
        </label>
      </div>
      <div className="grid gap-3">
        {DAYS.map((day, i) => {
          const windows = s.weekly[String(i)] ?? [];
          return (
            <div key={day} className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
              <p className="text-sm font-medium">{day}</p>
              <div className="flex flex-wrap items-center gap-2">
                {windows.map((w, wi) => (
                  <span key={wi} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1">
                    <label className="sr-only" htmlFor={`w-${i}-${wi}-s`}>{day} start</label>
                    <input
                      id={`w-${i}-${wi}-s`}
                      type="time"
                      value={w.start}
                      onChange={(e) => setS({ ...s, weekly: { ...s.weekly, [i]: windows.map((x, k) => (k === wi ? { ...x, start: e.target.value } : x)) } })}
                      className="text-sm"
                    />
                    –
                    <label className="sr-only" htmlFor={`w-${i}-${wi}-e`}>{day} end</label>
                    <input
                      id={`w-${i}-${wi}-e`}
                      type="time"
                      value={w.end}
                      onChange={(e) => setS({ ...s, weekly: { ...s.weekly, [i]: windows.map((x, k) => (k === wi ? { ...x, end: e.target.value } : x)) } })}
                      className="text-sm"
                    />
                    <button type="button" aria-label={`Remove ${day} window`} onClick={() => setS({ ...s, weekly: { ...s.weekly, [i]: windows.filter((_, k) => k !== wi) } })}>
                      <Trash2 className="size-3.5 text-muted" aria-hidden />
                    </button>
                  </span>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setS({ ...s, weekly: { ...s.weekly, [i]: [...windows, { start: "09:00", end: "12:00" }] } })}>
                  <Plus className="size-3.5" aria-hidden /> Add hours
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Minimum notice (hours)" htmlFor="s-lead">
          <Input id="s-lead" type="number" min={0} value={s.leadTimeHours} onChange={(e) => setS({ ...s, leadTimeHours: Number(e.target.value) })} />
        </Field>
        <Field label="Booking window (days)" htmlFor="s-hor">
          <Input id="s-hor" type="number" min={1} value={s.horizonDays} onChange={(e) => setS({ ...s, horizonDays: Number(e.target.value) })} />
        </Field>
        <Field label="UTC offset" htmlFor="s-off">
          <Input id="s-off" value={s.utcOffset} onChange={(e) => setS({ ...s, utcOffset: e.target.value })} />
        </Field>
        <Field label="Time zone label" htmlFor="s-tz">
          <Input id="s-tz" value={s.timeZoneLabel} onChange={(e) => setS({ ...s, timeZoneLabel: e.target.value })} />
        </Field>
      </div>
      <Field label="Unavailable dates (YYYY-MM-DD, one per line)" htmlFor="s-black">
        <Textarea id="s-black" rows={3} className="font-mono" value={blackout} onChange={(e) => setBlackout(e.target.value)} />
      </Field>
      <div>
        <Button
          variant="teal"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveBookingSettings({
                ...s,
                blackoutDates: blackout
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              }),
            )
          }
        >
          Save schedule
        </Button>
      </div>
    </div>
  );
}

export function ServicesEditor({ services, instructors }: { services: BookableService[]; instructors: InstructorProfile[] }) {
  const { run, pending, message } = useAdminAction();
  const [items, setItems] = useState(services);
  const update = (i: number, patch: Partial<BookableService>) => setItems((list) => list.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <div className="grid gap-3">
      {message}
      {items.map((s, i) => (
        <div key={s.id || i} className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-[1.4fr_6rem_10rem_minmax(0,1fr)_auto] md:items-end">
          <Field label="Service" htmlFor={`sv-${i}-t`}>
            <Input id={`sv-${i}-t`} value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
          </Field>
          <Field label="Minutes" htmlFor={`sv-${i}-d`}>
            <Input id={`sv-${i}-d`} type="number" min={15} value={s.durationMinutes} onChange={(e) => update(i, { durationMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Instructor" htmlFor={`sv-${i}-i`}>
            <Select id={`sv-${i}-i`} value={s.instructorId} onChange={(e) => update(i, { instructorId: e.target.value })}>
              {instructors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pricing note" htmlFor={`sv-${i}-p`}>
            <Input id={`sv-${i}-p`} value={s.pricingNote} onChange={(e) => update(i, { pricingNote: e.target.value })} />
          </Field>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" className="size-4 accent-teal-600" checked={s.active} onChange={(e) => update(i, { active: e.target.checked })} /> Active
            </label>
            <Button size="sm" variant="teal" disabled={pending} onClick={() => run(() => saveBookableService({ ...s, id: s.id || slugify(s.title) }))}>
              Save
            </Button>
          </div>
          <div className="md:col-span-5">
            <Field label="Description" htmlFor={`sv-${i}-desc`}>
              <Input id={`sv-${i}-desc`} value={s.description} onChange={(e) => update(i, { description: e.target.value })} />
            </Field>
          </div>
        </div>
      ))}
      <div>
        <Button
          variant="outline"
          onClick={() =>
            setItems((list) => [
              ...list,
              { id: "", title: "", description: "", durationMinutes: 60, instructorId: instructors[0]?.id ?? "", pricingNote: "Pricing on request", active: false, mode: "Online" },
            ])
          }
        >
          <Plus className="size-4" aria-hidden /> Add service
        </Button>
      </div>
    </div>
  );
}

const inquiryTone = { new: "amber", in_progress: "teal", responded: "green", closed: "gray" } as const;

function InquiryRow({ inq }: { inq: Inquiry }) {
  const [status, setStatus] = useState<InquiryStatus>(inq.status);
  const [note, setNote] = useState(inq.adminNote);
  const { run, pending, message } = useAdminAction();
  return (
    <li className="rounded-2xl border border-line bg-white p-5">
      {message}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-950">
            {inq.serviceCategory || inq.courseSlug || inq.kind} <span className="text-xs font-normal text-muted">· {inq.kind}</span>
          </p>
          <p className="text-sm text-muted">
            {inq.name} · <a className="underline" href={`mailto:${inq.email}?subject=${encodeURIComponent(`Re: your request ${inq.reference}`)}`}>{inq.email}</a>
            {inq.phone ? ` · ${inq.phone}` : ""}
            {inq.organization ? ` · ${inq.organization}` : ""}
          </p>
          <p className="text-xs text-muted">
            Ref {inq.reference} · {formatDate(inq.createdAt)}
            {inq.deadline ? ` · deadline: ${inq.deadline}` : ""}
            {inq.participants ? ` · participants: ${inq.participants}` : ""}
          </p>
        </div>
        <Badge tone={inquiryTone[inq.status]}>{inq.status.replace("_", " ")}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm">{inq.description}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-end">
        <Field label="Status" htmlFor={`is-${inq.id}`}>
          <Select id={`is-${inq.id}`} value={status} onChange={(e) => setStatus(e.target.value as InquiryStatus)}>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="responded">Responded</option>
            <option value="closed">Closed</option>
          </Select>
        </Field>
        <Field label="Internal note" htmlFor={`in-${inq.id}`}>
          <Input id={`in-${inq.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button variant="teal" disabled={pending} onClick={() => run(() => updateInquiry(inq.id, status, note))}>
          Update
        </Button>
      </div>
    </li>
  );
}

export function InquiriesList({ inquiries }: { inquiries: Inquiry[] }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const list = inquiries.filter((i) => filter === "all" || i.status === "new" || i.status === "in_progress");
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Inquiries">
        {(["open", "all"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={filter === v} onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${filter === v ? "bg-white shadow-sm" : "text-muted"}`}>
            {v}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="grid gap-3">
          {list.map((i) => (
            <InquiryRow key={i.id} inq={i} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No inquiries to show" />
      )}
    </div>
  );
}
