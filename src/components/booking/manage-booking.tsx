"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SlotDay } from "@/lib/booking";
import { cancelBookingByToken, getRescheduleSlots, rescheduleBookingByToken } from "@/app/actions/forms";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SlotPicker } from "./slot-picker";

export function ManageBooking({ token, status, isPast }: { token: string; status: string; isPast: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [current, setCurrent] = useState(status);
  const [slots, setSlots] = useState<{ days: SlotDay[]; timeZoneLabel: string } | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  if (current === "cancelled") return <Notice tone="info">This booking has been cancelled.</Notice>;
  if (isPast) return <Notice tone="info">This session time has passed. Contact BDIM for any changes.</Notice>;

  return (
    <div className="grid gap-4">
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {slots ? (
        <div className="rounded-2xl border border-line bg-white p-5">
          <SlotPicker days={slots.days} timeZoneLabel={slots.timeZoneLabel} value={selected} onChange={setSelected} />
          <div className="mt-4 flex gap-2">
            <Button
              variant="teal"
              disabled={!selected || busy}
              onClick={async () => {
                setBusy(true);
                const res = await rescheduleBookingByToken(token, selected);
                setBusy(false);
                if (res.ok) {
                  setMessage({ tone: "success", text: `Rescheduled to ${res.when}.` });
                  setSlots(null);
                  router.refresh();
                } else setMessage({ tone: "error", text: res.message });
              }}
            >
              Confirm new time
            </Button>
            <Button variant="ghost" onClick={() => setSlots(null)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await getRescheduleSlots(token);
              setBusy(false);
              if (res.ok) setSlots({ days: res.days, timeZoneLabel: res.timeZoneLabel });
              else setMessage({ tone: "error", text: res.message });
            }}
          >
            Reschedule
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Cancel this booking?")) return;
              setBusy(true);
              const res = await cancelBookingByToken(token);
              setBusy(false);
              if (res.ok) {
                setCurrent("cancelled");
                router.refresh();
              } else setMessage({ tone: "error", text: res.message });
            }}
          >
            Cancel booking
          </Button>
        </div>
      )}
    </div>
  );
}
