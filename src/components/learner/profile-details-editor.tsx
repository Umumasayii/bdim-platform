"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { GENDERS, INTERESTS, OCCUPATIONS, type ProfileDetails } from "@/lib/profile-options";
import { LocationPicker } from "@/components/forms/location-picker";

/** Gender, location, organization, occupation, interests and phone — the same questions as the sign-up form. */
export function ProfileDetailsEditor({ value, onChange }: { value: ProfileDetails; onChange: (next: ProfileDetails) => void }) {
  const set = (patch: Partial<ProfileDetails>) => onChange({ ...value, ...patch });

  return (
    <fieldset className="grid gap-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-navy-950">About you</legend>
      <Field label="Gender" htmlFor="pd-gender">
        <Select id="pd-gender" value={value.gender} onChange={(e) => set({ gender: e.target.value })}>
          <option value="">Choose…</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>
      <LocationPicker
        idPrefix="pd"
        value={{ country: value.country, province: value.province ?? "", city: value.city }}
        onChange={(loc) => set(loc)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization or school" htmlFor="pd-org">
          <Input id="pd-org" value={value.organization} maxLength={160} onChange={(e) => set({ organization: e.target.value })} />
        </Field>
        <Field label="Occupation" htmlFor="pd-occupation">
          <Select id="pd-occupation" value={value.occupation} onChange={(e) => set({ occupation: e.target.value })}>
            <option value="">Choose…</option>
            {OCCUPATIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {value.occupation && !(OCCUPATIONS as readonly string[]).includes(value.occupation) ? <option value={value.occupation}>{value.occupation}</option> : null}
          </Select>
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-navy-900">What would you like to learn?</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((t) => {
            const on = value.interests.includes(t);
            return (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:checked]:text-teal-800"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-teal-600"
                  checked={on}
                  onChange={() => set({ interests: on ? value.interests.filter((x) => x !== t) : [...value.interests, t] })}
                />
                {t}
              </label>
            );
          })}
        </div>
      </div>
      <Field label="Phone / WhatsApp" htmlFor="pd-phone">
        <Input id="pd-phone" type="tel" inputMode="tel" value={value.phone} maxLength={30} placeholder="078…" onChange={(e) => set({ phone: e.target.value })} />
      </Field>
    </fieldset>
  );
}
