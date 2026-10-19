"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { UserRow } from "@/lib/data/users";
import { Input, Select } from "@/components/ui/field";
import { GENDERS, INTERESTS, genderLabel } from "@/lib/profile-options";
import { formatDate } from "@/lib/utils";

export type DirectoryRow = Pick<
  UserRow,
  "id" | "email" | "fullName" | "role" | "gender" | "country" | "province" | "city" | "organization" | "occupation" | "interests" | "phone" | "createdAt" | "lastSeenAt" | "lastSignInAt"
>;

/** Everyone, with filters for country, gender and interest and a free-text search. */
export function PeopleDirectory({ rows }: { rows: DirectoryRow[] }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [interest, setInterest] = useState("");
  const countries = useMemo(() => [...new Set(rows.map((r) => r.country).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!country || r.country === country) &&
        (!gender || r.gender === gender) &&
        (!interest || r.interests.includes(interest)) &&
        (!needle || [r.fullName, r.email, r.city, r.province, r.country, r.organization, r.occupation, r.phone].join(" ").toLowerCase().includes(needle)),
    );
  }, [rows, q, country, gender, interest]);

  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="dir-search" className="sr-only">
            Search people
          </label>
          <Input id="dir-search" className="pl-10" placeholder="Search name, email, place, organization…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select aria-label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">All genders</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Interest" value={interest} onChange={(e) => setInterest(e.target.value)}>
          <option value="">All interests</option>
          {INTERESTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {filtered.length} of {rows.length} people
      </p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[60rem] text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              {["Name", "Gender", "Location", "Occupation", "Organization", "Interests", "Phone", "Joined", "Last seen"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${r.id}`} className="font-semibold text-navy-950 hover:underline">
                    {r.fullName || r.email.split("@")[0]}
                  </Link>
                  <span className="block text-xs text-muted">{r.email}</span>
                  {r.role !== "learner" ? <span className="text-xs font-semibold capitalize text-teal-700">{r.role}</span> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.gender ? genderLabel(r.gender) : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2">{[r.city, r.province, r.country].filter(Boolean).join(", ") || <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2">{r.occupation || <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2">{r.organization || <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2">{r.interests.length ? r.interests.join(", ") : <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.phone || <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap px-3 py-2">{formatDate(r.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.lastSeenAt || r.lastSignInAt ? formatDate(r.lastSeenAt || r.lastSignInAt) : <span className="text-muted">Never</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
