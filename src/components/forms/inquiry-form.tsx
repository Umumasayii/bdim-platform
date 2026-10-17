"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitInquiry } from "@/app/actions/forms";
import { inquirySchema, type InquiryInput } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import type { InquiryKind } from "@/lib/types";

export function InquiryForm({
  kind,
  courseSlug = "",
  serviceCategory = "",
  categories,
  submitLabel = "Send request",
  descriptionLabel = "How can we help?",
  showParticipants = false,
}: {
  kind: InquiryKind;
  courseSlug?: string;
  serviceCategory?: string;
  categories?: string[];
  submitLabel?: string;
  descriptionLabel?: string;
  showParticipants?: boolean;
}) {
  const [result, setResult] = useState<{ reference: string; emailed: boolean } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { kind, courseSlug, serviceCategory, name: "", email: "", phone: "", organization: "", description: "", deadline: "", participants: "", website: "" },
  });

  async function onSubmit(values: InquiryInput) {
    setServerError(null);
    const res = await submitInquiry(values);
    if (!res.ok) {
      setServerError(res.message);
      Object.entries(res.errors ?? {}).forEach(([k, m]) => setError(k as keyof InquiryInput, { message: m }));
      return;
    }
    setResult({ reference: res.reference, emailed: res.emailed });
    reset();
  }

  if (result) {
    return (
      <Notice tone="success" title="Request received">
        Your request has been saved with reference <strong>{result.reference}</strong>.{" "}
        {result.emailed
          ? "A confirmation email has been sent."
          : "Email notifications are not configured yet, so please keep this reference — BDIM will reply to the email address you provided."}
        <div className="mt-3">
          <button type="button" className="font-semibold underline" onClick={() => setResult(null)}>
            Send another request
          </button>
        </div>
      </Notice>
    );
  }

  const err = (k: keyof InquiryInput) => errors[k]?.message as string | undefined;
  const aria = (k: keyof InquiryInput) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `inq-${k}-error` : undefined });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {serverError ? <Notice tone="error">{serverError}</Notice> : null}
      <input type="hidden" {...register("kind")} />
      <input type="hidden" {...register("courseSlug")} />
      {/* Honeypot field — hidden from people, often filled by bots */}
      <div className="hidden" aria-hidden>
        <label htmlFor="inq-website">Website</label>
        <input id="inq-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {categories ? (
        <Field label="Service category" htmlFor="inq-serviceCategory" error={err("serviceCategory")}>
          <Select id="inq-serviceCategory" {...register("serviceCategory")} {...aria("serviceCategory")}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" {...register("serviceCategory")} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="inq-name" error={err("name")} required>
          <Input id="inq-name" autoComplete="name" {...register("name")} {...aria("name")} />
        </Field>
        <Field label="Email" htmlFor="inq-email" error={err("email")} required>
          <Input id="inq-email" type="email" autoComplete="email" {...register("email")} {...aria("email")} />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="inq-phone" error={err("phone")}>
          <Input id="inq-phone" type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field label="Organization" htmlFor="inq-organization" error={err("organization")}>
          <Input id="inq-organization" autoComplete="organization" {...register("organization")} />
        </Field>
      </div>

      <Field
        label={descriptionLabel}
        htmlFor="inq-description"
        error={err("description")}
        hint="Describe your goals and context. Please don't include confidential or personal data about others."
        required
      >
        <Textarea id="inq-description" rows={5} {...register("description")} {...aria("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deadline or preferred start" htmlFor="inq-deadline" error={err("deadline")}>
          <Input id="inq-deadline" placeholder="e.g. March 2027" {...register("deadline")} />
        </Field>
        {showParticipants ? (
          <Field label="Number of participants" htmlFor="inq-participants" error={err("participants")}>
            <Input id="inq-participants" placeholder="e.g. 15" {...register("participants")} />
          </Field>
        ) : (
          <input type="hidden" {...register("participants")} />
        )}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-navy-900">
          <input type="checkbox" className="mt-1 size-4 accent-teal-600" {...register("consent")} aria-invalid={Boolean(errors.consent)} />
          <span>
            I agree that BDIM may store and use these details to respond to my request, as described in the{" "}
            <Link href="/privacy" className="font-medium text-teal-700 underline">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.consent ? (
          <p role="alert" className="mt-1 text-xs font-medium text-red-600">
            {errors.consent.message as string}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" variant="teal" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
