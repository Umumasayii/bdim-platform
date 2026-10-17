"use client";

import { useState } from "react";
import type { LibraryOrderStatus, PaymentSettings } from "@/lib/types";
import { savePaymentSettings, setLibraryOrderStatus } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/utils";
import { useAdminAction } from "./admin-ui";

export interface AdminOrder {
  id: string;
  itemTitle: string;
  buyer: string;
  amount: number;
  currency: string;
  status: LibraryOrderStatus;
  payerPhone: string;
  paymentReference: string;
  note: string;
  createdAt: string;
  paidAt: string | null;
}

const TONE = { pending: "amber", paid: "green", cancelled: "gray" } as const;

export function LibraryOrders({ orders }: { orders: AdminOrder[] }) {
  const { run, pending, message } = useAdminAction();
  const [filter, setFilter] = useState<LibraryOrderStatus | "all">("pending");
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  const count = (s: LibraryOrderStatus) => orders.filter((o) => o.status === s).length;
  return (
    <div className="grid gap-3">
      {message}
      <div role="tablist" aria-label="Order status" className="flex flex-wrap gap-2">
        {(["pending", "paid", "cancelled", "all"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            type="button"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === f ? "bg-navy-900 text-white" : "bg-surface text-navy-900 hover:bg-surface-2"}`}
          >
            {f === "pending" ? `Awaiting confirmation (${count("pending")})` : f === "paid" ? `Paid (${count("paid")})` : f === "cancelled" ? "Cancelled" : "All"}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="grid gap-3">
          {list.map((o) => (
            <li key={o.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-950">{o.itemTitle}</p>
                  <p className="text-xs text-muted">
                    {o.buyer} · ordered {formatDate(o.createdAt)}
                    {o.paidAt ? ` · confirmed ${formatDate(o.paidAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy-950">
                    {o.amount.toLocaleString("en-US")} {o.currency}
                  </span>
                  <Badge tone={TONE[o.status]}>{o.status === "pending" ? "Awaiting confirmation" : o.status === "paid" ? "Paid" : "Cancelled"}</Badge>
                </div>
              </div>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-muted">Paid from: </dt>
                  <dd className="inline font-medium">{o.payerPhone || "—"}</dd>
                </div>
                <div>
                  <dt className="inline text-muted">Transaction ID: </dt>
                  <dd className="inline font-medium">{o.paymentReference || "—"}</dd>
                </div>
                {o.note ? (
                  <div className="sm:col-span-2">
                    <dt className="inline text-muted">Note: </dt>
                    <dd className="inline">{o.note}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.status !== "paid" ? (
                  <Button size="sm" variant="teal" disabled={pending} onClick={() => run(() => setLibraryOrderStatus(o.id, "paid"))}>
                    Confirm payment & unlock
                  </Button>
                ) : null}
                {o.status !== "cancelled" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => window.confirm(o.status === "paid" ? "Cancel this paid order? The learner loses access." : "Cancel this order?") && run(() => setLibraryOrderStatus(o.id, "cancelled"))}
                  >
                    Cancel order
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={filter === "pending" ? "No payments waiting" : "No orders here"}>
          When a learner orders a paid item, it appears here. Check that the money arrived, then confirm to unlock the download.
        </EmptyState>
      )}
    </div>
  );
}

export function PaymentSettingsForm({ initial }: { initial: PaymentSettings }) {
  const [v, setV] = useState(initial);
  const { run, pending, message } = useAdminAction();
  const set = (k: keyof PaymentSettings, val: string) => setV((x) => ({ ...x, [k]: val }));
  return (
    <div className="grid gap-4">
      {message}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Mobile Money number" htmlFor="pay-momo">
          <Input id="pay-momo" value={v.momoNumber} onChange={(e) => set("momoNumber", e.target.value)} placeholder="e.g. 078 XXX XXXX" />
        </Field>
        <Field label="Name on the Mobile Money account" htmlFor="pay-name">
          <Input id="pay-name" value={v.momoName} onChange={(e) => set("momoName", e.target.value)} />
        </Field>
      </div>
      <Field label="Bank details (optional)" htmlFor="pay-bank">
        <Textarea id="pay-bank" rows={2} value={v.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} placeholder="Bank, account name, account number" />
      </Field>
      <Field label="Extra instructions (optional)" htmlFor="pay-ins">
        <Textarea id="pay-ins" rows={2} value={v.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="e.g. Use your name as the payment reason." />
      </Field>
      <div>
        <Button variant="teal" disabled={pending} onClick={() => run(() => savePaymentSettings(v))}>
          Save payment details
        </Button>
      </div>
    </div>
  );
}
