"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Category, Course } from "@/lib/types";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { CourseCard } from "./course-card";

export function CourseCatalog({ courses, categories }: { courses: Course[]; categories: Category[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const category = params.get("category") ?? "";
  const level = params.get("level") ?? "";
  const format = params.get("format") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter(
      (c) =>
        (!category || c.category === category) &&
        (!level || c.level === level) &&
        (!format || c.formats.includes(format as Course["formats"][number])) &&
        (!q ||
          [c.title, c.summary, c.description, ...c.skills, ...c.tools].join(" ").toLowerCase().includes(q)),
    );
  }, [courses, query, category, level, format]);

  const grouped = categories
    .map((cat) => ({ cat, items: filtered.filter((c) => c.category === cat.id) }))
    .filter((g) => g.items.length);

  const active = Boolean(query || category || level || format);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 border-b border-line bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="grid gap-3 md:grid-cols-[1fr_repeat(3,minmax(0,12rem))]">
          <div className="relative">
            <label htmlFor="course-search" className="sr-only">
              Search courses
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              id="course-search"
              type="search"
              placeholder="Search by course, skill or tool (e.g. Power BI, regression)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select aria-label="Category" value={category} onChange={(e) => setParam("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.short}
              </option>
            ))}
          </Select>
          <Select aria-label="Level" value={level} onChange={(e) => setParam("level", e.target.value)}>
            <option value="">All levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </Select>
          <Select aria-label="Format" value={format} onChange={(e) => setParam("format", e.target.value)}>
            <option value="">All formats</option>
            <option>Live online</option>
            <option>In person (Kigali)</option>
            <option>Self-paced</option>
            <option>Corporate / group</option>
          </Select>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <p aria-live="polite">
            {filtered.length} of {courses.length} courses
          </p>
          {active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                router.replace(pathname, { scroll: false });
              }}
            >
              <X className="size-4" aria-hidden /> Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-14">
        {grouped.length ? (
          grouped.map(({ cat, items }) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <div className="mb-5">
                <h2 id={`cat-${cat.id}`} className="text-2xl font-bold text-navy-950">
                  {cat.title}
                </h2>
                <p className="mt-1 text-muted">{cat.description}</p>
              </div>
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <li key={c.id}>
                    <CourseCard course={c} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <EmptyState title="No courses match your filters">Try a different search term or clear the filters.</EmptyState>
        )}
      </div>
    </div>
  );
}
