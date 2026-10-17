"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InstructorProfile, Testimonial } from "@/lib/types";
import { deleteTestimonial, saveInstructor, saveTestimonial } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { lines, toLines, useAdminAction } from "./admin-ui";

export function InstructorEditor({ profile }: { profile: InstructorProfile }) {
  const [p, setP] = useState(profile);
  const [linksText, setLinksText] = useState(profile.links.map((l) => `${l.label} | ${l.url}`).join("\n"));
  const { run, pending, message } = useAdminAction();
  const set = <K extends keyof InstructorProfile>(k: K, v: InstructorProfile[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-white p-6">
      {message}
      <Notice tone="warning">Only add verified information: qualifications, employment history and achievements must be accurate and confirmed.</Notice>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" htmlFor={`${p.id}-n`}>
          <Input id={`${p.id}-n`} value={p.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Title / role" htmlFor={`${p.id}-t`}>
          <Input id={`${p.id}-t`} value={p.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
      </div>
      <Field label="Photo URL" htmlFor={`${p.id}-ph`} hint="Put the photo in public/brand/ and enter e.g. /brand/instructor.jpg, or use an https:// URL.">
        <Input id={`${p.id}-ph`} value={p.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} />
      </Field>
      <Field label="Biography" htmlFor={`${p.id}-b`}>
        <Textarea id={`${p.id}-b`} rows={5} value={p.bio} onChange={(e) => set("bio", e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Verified expertise (one per line)" htmlFor={`${p.id}-e`}>
          <Textarea id={`${p.id}-e`} rows={4} value={lines(p.expertise)} onChange={(e) => set("expertise", toLines(e.target.value))} />
        </Field>
        <Field label="Teaching interests (one per line)" htmlFor={`${p.id}-i`}>
          <Textarea id={`${p.id}-i`} rows={4} value={lines(p.teachingInterests)} onChange={(e) => set("teachingInterests", toLines(e.target.value))} />
        </Field>
      </div>
      <Field label="Professional links (Label | https://url, one per line)" htmlFor={`${p.id}-l`}>
        <Textarea id={`${p.id}-l`} rows={3} value={linksText} onChange={(e) => setLinksText(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={p.verified} onChange={(e) => set("verified", e.target.checked)} /> Profile details verified
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={p.published} onChange={(e) => set("published", e.target.checked)} /> Show on site
        </label>
        <Button
          className="ml-auto"
          variant="teal"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveInstructor({
                ...p,
                links: toLines(linksText)
                  .map((row) => row.split("|").map((s) => s.trim()))
                  .filter(([a, b]) => a && b)
                  .map(([label, url]) => ({ label, url })),
              }),
            )
          }
        >
          Save profile
        </Button>
      </div>
    </div>
  );
}

export function TestimonialsEditor({ items }: { items: Testimonial[] }) {
  const { run, pending, message } = useAdminAction();
  const empty = (): Testimonial => ({ id: "", name: "", role: "", organization: "", quote: "", verified: false, published: false, createdAt: "" });
  const [draft, setDraft] = useState<Testimonial>(empty);
  return (
    <div className="grid gap-6">
      {message}
      <Notice tone="info">
        Publish only real testimonials from real people who have given consent. Mark a testimonial verified once you have confirmed its source; only
        verified testimonials can be published. The homepage section stays hidden until at least one is published.
      </Notice>
      <ul className="grid gap-3">
        {items.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy-950">{t.name}</p>
                <p className="text-xs text-muted">{[t.role, t.organization].filter(Boolean).join(", ")}</p>
              </div>
              <div className="flex gap-2">
                {t.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
                {t.published ? <Badge tone="teal">Published</Badge> : <Badge>Hidden</Badge>}
              </div>
            </div>
            <p className="mt-2 text-sm text-navy-900">“{t.quote}”</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!t.verified ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => saveTestimonial({ ...t, verified: true }))}>
                  Mark verified
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !t.verified}
                onClick={() => run(() => saveTestimonial({ ...t, published: !t.published }))}
              >
                {t.published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm("Delete this testimonial?") && run(() => deleteTestimonial(t.id))}>
                <Trash2 className="size-4" aria-hidden /> Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-4 rounded-2xl border border-line bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveTestimonial({ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString(), published: false }), () => setDraft(empty()));
        }}
      >
        <h2 className="font-bold text-navy-950">Add a testimonial</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Name" htmlFor="t-name" required>
            <Input id="t-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Role" htmlFor="t-role">
            <Input id="t-role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </Field>
          <Field label="Organization" htmlFor="t-org">
            <Input id="t-org" value={draft.organization} onChange={(e) => setDraft({ ...draft, organization: e.target.value })} />
          </Field>
        </div>
        <Field label="Quote (exactly as given, with consent)" htmlFor="t-quote" required>
          <Textarea id="t-quote" rows={3} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-teal-600" checked={draft.verified} onChange={(e) => setDraft({ ...draft, verified: e.target.checked })} />I have
          confirmed this testimonial and the person consented to publication
        </label>
        <div>
          <Button type="submit" variant="teal" disabled={pending}>
            <Plus className="size-4" aria-hidden /> Add (hidden until published)
          </Button>
        </div>
      </form>
    </div>
  );
}
